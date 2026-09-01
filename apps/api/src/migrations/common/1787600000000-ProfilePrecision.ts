import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The profile learns to say how much each wish is worth.
 *
 * Until now every filled-in field counted the same, so somebody who cannot
 * leave their city and somebody who would move for the right domain got the
 * same ranking. `weights` carries the difference, and the rest of these columns
 * exist because the scorer was reading around gaps: a salary threshold with no
 * currency, a title that could only be matched as loose description text, and
 * no way to say "this term is not optional" or "never this company".
 */
export class ProfilePrecision1787600000000 implements MigrationInterface {
  name = 'ProfilePrecision1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_preference"
        ADD "titles" text[] NOT NULL DEFAULT '{}',
        ADD "requiredKeywords" text[] NOT NULL DEFAULT '{}',
        ADD "industries" "public"."company_industry_enum"[] NOT NULL DEFAULT '{}',
        ADD "excludedCompanyIds" uuid[] NOT NULL DEFAULT '{}',
        ADD "salaryCurrency" character varying(3),
        ADD "maxAgeDays" integer,
        ADD "openToRelocation" boolean NOT NULL DEFAULT false,
        ADD "weights" jsonb NOT NULL DEFAULT '{}'`,
    );

    // Titles are matched as substrings of the offer's title, which no b-tree can
    // serve. pg_trgm is already enabled for the company search.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_title_trgm"
        ON "job_posting" USING gin (lower("title") gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_job_posting_title_trgm"`);
    await queryRunner.query(
      `ALTER TABLE "job_preference"
        DROP COLUMN "weights",
        DROP COLUMN "openToRelocation",
        DROP COLUMN "maxAgeDays",
        DROP COLUMN "salaryCurrency",
        DROP COLUMN "excludedCompanyIds",
        DROP COLUMN "industries",
        DROP COLUMN "requiredKeywords",
        DROP COLUMN "titles"`,
    );
  }
}
