import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full offer data plus the lifecycle columns that let an offer expire.
 *
 * Existing rows are backfilled with `lastSeenAt = updatedAt` so the first
 * reconciliation pass does not treat the whole table as freshly discovered.
 */
export class AddJobPostingDetailAndLifecycle1787000000000 implements MigrationInterface {
  name = 'AddJobPostingDetailAndLifecycle1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."job_posting_employmenttype_enum" AS ENUM (
        'FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP',
        'APPRENTICESHIP', 'FREELANCE', 'VOLUNTEER', 'OTHER'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_posting_remotetype_enum" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."job_posting_closedreason_enum" AS ENUM (
        'REMOVED_FROM_LISTING', 'DEAD_LINK', 'MARKED_CLOSED', 'EXPIRED'
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
        ADD "descriptionHtml" text,
        ADD "department" character varying,
        ADD "employmentType" "public"."job_posting_employmenttype_enum",
        ADD "remoteType" "public"."job_posting_remotetype_enum",
        ADD "salaryCurrency" character varying,
        ADD "saved" boolean NOT NULL DEFAULT false,
        ADD "savedAt" TIMESTAMP,
        ADD "validThrough" TIMESTAMP,
        ADD "lastSeenAt" TIMESTAMP,
        ADD "closedAt" TIMESTAMP,
        ADD "closedReason" "public"."job_posting_closedreason_enum",
        ADD "detailFetchedAt" TIMESTAMP,
        ADD "lastValidatedAt" TIMESTAMP,
        ADD "applicationId" uuid`,
    );

    await queryRunner.query(
      `UPDATE "job_posting" SET "lastSeenAt" = "updatedAt" WHERE "lastSeenAt" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "FK_job_posting_application"
       FOREIGN KEY ("applicationId") REFERENCES "application"("id")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // The board query is always "this user's open offers, newest first".
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_closed" ON "job_posting" ("userId", "closedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_posted" ON "job_posting" ("userId", "postedAt")`,
    );
    // The validity pass picks the least recently checked open offers.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_last_seen" ON "job_posting" ("lastSeenAt")`,
    );
    // Reconciliation matches a whole board's worth of URLs at once.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_company_source" ON "job_posting" ("userId", "companyId", "source")`,
    );
    // Free-text search.
    //
    // A stored generated column rather than a trigger: Postgres keeps it in step
    // with the row for free, and `ILIKE '%term%'` over a description column
    // cannot use an index at all — which stops being survivable once a few
    // hundred watched boards are ingested.
    //
    // The 'simple' dictionary is deliberate: postings here are a mix of French
    // and English, and no single stemmer serves both. Prefix matching in the
    // query recovers what stemming would have given (engineer/engineers,
    // développeur/développeurs).
    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD COLUMN "searchVector" tsvector
       GENERATED ALWAYS AS (
         setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
         setweight(to_tsvector('simple', coalesce("location", '')), 'B') ||
         setweight(to_tsvector('simple', coalesce("department", '')), 'B') ||
         setweight(to_tsvector('simple', coalesce("description", '')), 'C')
       ) STORED`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_search" ON "job_posting" USING gin ("searchVector")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_job_posting_search"`);
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP COLUMN "searchVector"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_user_company_source"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_job_posting_last_seen"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_user_posted"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_user_closed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT "FK_job_posting_application"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting"
        DROP COLUMN "applicationId",
        DROP COLUMN "lastValidatedAt",
        DROP COLUMN "detailFetchedAt",
        DROP COLUMN "closedReason",
        DROP COLUMN "closedAt",
        DROP COLUMN "lastSeenAt",
        DROP COLUMN "validThrough",
        DROP COLUMN "savedAt",
        DROP COLUMN "saved",
        DROP COLUMN "salaryCurrency",
        DROP COLUMN "remoteType",
        DROP COLUMN "employmentType",
        DROP COLUMN "department",
        DROP COLUMN "descriptionHtml"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."job_posting_closedreason_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."job_posting_remotetype_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."job_posting_employmenttype_enum"`,
    );
  }
}
