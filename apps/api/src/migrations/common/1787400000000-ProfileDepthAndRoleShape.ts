import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The profile learns what a person wants to *work on*, and offers learn what
 * they *are*.
 *
 * Matching a domain ("backend", "product") against an offer's free text is a
 * comparison the database cannot index and the scorer cannot trust. Classifying
 * each offer once at ingest turns it into a column, which is what lets the
 * board rank by fit rather than by keyword luck.
 */
export class ProfileDepthAndRoleShape1787400000000 implements MigrationInterface {
  name = 'ProfileDepthAndRoleShape1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."work_domain_enum" AS ENUM (
        'FRONTEND','BACKEND','FULLSTACK','MOBILE','DATA','MACHINE_LEARNING',
        'INFRASTRUCTURE','SECURITY','EMBEDDED','QA','PRODUCT','DESIGN',
        'RESEARCH','DEVREL','SALES','MARKETING','OPERATIONS','FINANCE','OTHER'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seniority_level_enum" AS ENUM (
        'INTERN','JUNIOR','MID','SENIOR','LEAD','MANAGER','DIRECTOR'
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
        ADD "domain" "public"."work_domain_enum",
        ADD "seniority" "public"."seniority_level_enum"`,
    );
    // The board's default ranking reads both of these on every row it scores.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_domain" ON "job_posting" ("domain")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_seniority" ON "job_posting" ("seniority")`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_preference"
        ADD "domains" "public"."work_domain_enum"[] NOT NULL DEFAULT '{}',
        ADD "seniorities" "public"."seniority_level_enum"[] NOT NULL DEFAULT '{}',
        ADD "motivations" text[] NOT NULL DEFAULT '{}',
        ADD "resumeText" text,
        ADD "resumeKeywords" text[] NOT NULL DEFAULT '{}',
        ADD "resumeUpdatedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_preference"
        DROP COLUMN "resumeUpdatedAt",
        DROP COLUMN "resumeKeywords",
        DROP COLUMN "resumeText",
        DROP COLUMN "motivations",
        DROP COLUMN "seniorities",
        DROP COLUMN "domains"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_job_posting_seniority"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_job_posting_domain"`);
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP COLUMN "seniority", DROP COLUMN "domain"`,
    );
    await queryRunner.query(`DROP TYPE "public"."seniority_level_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_domain_enum"`);
  }
}
