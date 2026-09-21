import { MigrationInterface, QueryRunner } from 'typeorm';
import { fold } from '../../features/job-posting/ingest/dedup-key';

interface Row {
  id: string;
  title: string;
  location: string | null;
  city: string | null;
}

/**
 * Gives every offer the key that says which opening it is, and merges the
 * copies that key reveals.
 *
 * The backfill runs in TypeScript rather than SQL on purpose: the key has to be
 * byte-identical to the one the API writes from now on, and folding accents in
 * SQL would need `unaccent` and a second copy of the rules to drift from.
 */
export class JobPostingDedupKey1787800000000 implements MigrationInterface {
  name = 'JobPostingDedupKey1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD COLUMN "dedupKey" text`,
    );

    const rows = (await queryRunner.query(
      `SELECT jp."id", jp."title", jp."location",
              (SELECT l."city" FROM "job_posting_location" l
                WHERE l."jobPostingId" = jp."id" AND l."city" IS NOT NULL
                ORDER BY l."id" LIMIT 1) AS city
       FROM "job_posting" jp`,
    )) as Row[];

    const CHUNK = 500;
    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const params: unknown[] = [];
      const tuples = chunk.map((row) => {
        const place = row.city ?? row.location?.split(',')[0] ?? '';
        params.push(row.id, `${fold(row.title)}|${fold(place)}`);
        return `($${params.length - 1}::uuid, $${params.length}::text)`;
      });
      await queryRunner.query(
        `UPDATE "job_posting" jp SET "dedupKey" = v.key
         FROM (VALUES ${tuples.join(', ')}) AS v(id, key)
         WHERE jp."id" = v.id`,
        params,
      );
    }

    // One surviving row per (company, key). The oldest wins, so `createdAt`
    // keeps meaning "when we first saw this offer" — same rule as the crawl's
    // merge, which refills whatever the thinner copy was missing.
    await queryRunner.query(
      `CREATE TEMP TABLE "canonical_posting" AS
       SELECT DISTINCT ON ("companyId", "dedupKey")
              "id" AS canonical_id, "companyId", "dedupKey"
       FROM "job_posting"
       ORDER BY "companyId", "dedupKey", "createdAt" ASC, "id" ASC`,
    );

    // Everything a user did survives, pointed at the surviving row. Where the
    // same user held two copies of one offer, the one they engaged with most
    // wins — APPLIED outranks DISMISSED outranks SEEN.
    await queryRunner.query(
      `INSERT INTO "job_posting_interaction"
         ("userId", "jobPostingId", "status", "saved", "savedAt", "applicationId", "createdAt")
       SELECT DISTINCT ON (i."userId", c.canonical_id)
              i."userId", c.canonical_id, i."status", i."saved", i."savedAt",
              i."applicationId", i."createdAt"
       FROM "job_posting_interaction" i
       JOIN "job_posting" jp ON jp."id" = i."jobPostingId"
       JOIN "canonical_posting" c
         ON c."companyId" = jp."companyId" AND c."dedupKey" = jp."dedupKey"
       WHERE i."jobPostingId" <> c.canonical_id
       ORDER BY i."userId", c.canonical_id,
                CASE i."status"
                  WHEN 'APPLIED' THEN 0
                  WHEN 'DISMISSED' THEN 1
                  WHEN 'SEEN' THEN 2
                  ELSE 3
                END,
                i."applicationId" NULLS LAST,
                i."saved" DESC
       ON CONFLICT ("userId", "jobPostingId") DO NOTHING`,
    );

    await queryRunner.query(
      `DELETE FROM "job_posting" jp
       USING "canonical_posting" c
       WHERE c."companyId" = jp."companyId"
         AND c."dedupKey" = jp."dedupKey"
         AND jp."id" <> c.canonical_id`,
    );
    await queryRunner.query(`DROP TABLE "canonical_posting"`);

    await queryRunner.query(
      `ALTER TABLE "job_posting" ALTER COLUMN "dedupKey" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "UQ_job_posting_company_dedup" UNIQUE ("companyId", "dedupKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT "UQ_job_posting_company_dedup"`,
    );
    await queryRunner.query(`ALTER TABLE "job_posting" DROP COLUMN "dedupKey"`);
  }
}
