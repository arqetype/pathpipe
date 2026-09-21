import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One company per name, whatever the case.
 *
 * Board discovery probes both "nvidia" and the company's own "NVIDIA", and a
 * vendor answers to either — so the same board came back twice and was
 * registered as two companies. The seeder now keeps one hit per board, and this
 * is the guard behind it: nothing else can create the second copy either.
 */
export class CompanyNameCaseInsensitive1787900000000 implements MigrationInterface {
  name = 'CompanyNameCaseInsensitive1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The oldest spelling of each name survives — it is the one whatever a user
    // already watches or applied through is pointed at.
    await queryRunner.query(
      `CREATE TEMP TABLE "company_merge" AS
       SELECT c."id" AS dup_id, k.canonical_id
       FROM "company" c
       JOIN (
         SELECT DISTINCT ON (lower(btrim("name")))
                lower(btrim("name")) AS key, "id" AS canonical_id
         FROM "company"
         ORDER BY lower(btrim("name")), "created_at" ASC, "id" ASC
       ) k ON k.key = lower(btrim(c."name"))
       WHERE c."id" <> k.canonical_id`,
    );

    // Where each posting is about to live, so the copies can be collapsed
    // before anything moves. Two companies merging into one bring collisions
    // with each other, not only with the survivor's own postings, so the
    // question is asked of the destination rather than of one pair at a time.
    await queryRunner.query(
      `CREATE TEMP TABLE "posting_target" AS
       SELECT jp."id",
              COALESCE(m.canonical_id, jp."companyId") AS target_company,
              jp."dedupKey", jp."url", jp."externalId", jp."createdAt"
       FROM "job_posting" jp
       LEFT JOIN "company_merge" m ON m.dup_id = jp."companyId"`,
    );

    // Every unique key the destination enforces, collapsed in turn: the same
    // offer can be a duplicate by any one of them, and surviving two of the
    // three still violates the third.
    for (const key of ['dedupKey', 'url', 'externalId'] as const) {
      const defined =
        key === 'externalId' ? `p."externalId" IS NOT NULL` : 'true';

      // The oldest copy in each group wins, as everywhere else in this merge.
      await queryRunner.query(
        `CREATE TEMP TABLE "posting_merge" AS
         SELECT p."id" AS dup_id, k.canonical_id
         FROM "posting_target" p
         JOIN (
           SELECT DISTINCT ON (target_company, "${key}")
                  target_company, "${key}" AS key, "id" AS canonical_id
           FROM "posting_target" p
           WHERE ${defined}
           ORDER BY target_company, "${key}", "createdAt" ASC, "id" ASC
         ) k ON k.target_company = p.target_company AND k.key = p."${key}"
         WHERE p."id" <> k.canonical_id AND ${defined}`,
      );

      // What a user did with the losing copy follows the surviving one, before
      // that copy is dropped.
      await queryRunner.query(
        `INSERT INTO "job_posting_interaction"
           ("userId", "jobPostingId", "status", "saved", "savedAt", "applicationId", "createdAt")
         SELECT DISTINCT ON (i."userId", m.canonical_id)
                i."userId", m.canonical_id, i."status", i."saved", i."savedAt",
                i."applicationId", i."createdAt"
         FROM "job_posting_interaction" i
         JOIN "posting_merge" m ON m.dup_id = i."jobPostingId"
         ORDER BY i."userId", m.canonical_id,
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
        `DELETE FROM "job_posting" jp USING "posting_merge" m
         WHERE jp."id" = m.dup_id`,
      );
      // The next pass reads what is left, not what was there to begin with.
      await queryRunner.query(
        `DELETE FROM "posting_target" p USING "posting_merge" m
         WHERE p."id" = m.dup_id`,
      );
      await queryRunner.query(`DROP TABLE "posting_merge"`);
    }

    await queryRunner.query(`DROP TABLE "posting_target"`);

    await queryRunner.query(
      `UPDATE "job_posting" jp SET "companyId" = m.canonical_id
       FROM "company_merge" m WHERE jp."companyId" = m.dup_id`,
    );

    await queryRunner.query(
      `UPDATE "application" a SET "companyId" = m.canonical_id
       FROM "company_merge" m WHERE a."companyId" = m.dup_id`,
    );

    await queryRunner.query(
      `DELETE FROM "company_watch" w
       USING "company_merge" m, "company_watch" keep
       WHERE w."companyId" = m.dup_id
         AND keep."companyId" = m.canonical_id
         AND keep."userId" = w."userId"`,
    );
    await queryRunner.query(
      `UPDATE "company_watch" w SET "companyId" = m.canonical_id
       FROM "company_merge" m WHERE w."companyId" = m.dup_id`,
    );

    // Whatever the survivor was missing, the copy may have had.
    await queryRunner.query(
      `UPDATE "company" c SET
         "careersUrl" = COALESCE(c."careersUrl", d."careersUrl"),
         "website" = COALESCE(c."website", d."website"),
         "isMonitored" = c."isMonitored" OR d."isMonitored"
       FROM "company_merge" m
       JOIN "company" d ON d."id" = m.dup_id
       WHERE c."id" = m.canonical_id`,
    );

    await queryRunner.query(
      `DELETE FROM "company" c USING "company_merge" m WHERE c."id" = m.dup_id`,
    );
    await queryRunner.query(`DROP TABLE "company_merge"`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_company_name_lower"
       ON "company" (lower(btrim("name")))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_company_name_lower"`);
  }
}
