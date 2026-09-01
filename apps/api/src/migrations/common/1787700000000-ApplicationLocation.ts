import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * An application learns where the job is.
 *
 * Two columns rather than one line, and the country as a code: the point of
 * recording a location is to sort and search by it, and free text like
 * "Paris, France" against "Paris (FR)" makes one place look like two.
 */
export class ApplicationLocation1787700000000 implements MigrationInterface {
  name = 'ApplicationLocation1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application"
        ADD "city" character varying,
        ADD "country" character varying(2)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_application_city" ON "application" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_application_country" ON "application" ("country")`,
    );
    // The city autocomplete matches on any part of a name, which no b-tree can
    // serve; pg_trgm is already enabled for the company search.
    await queryRunner.query(
      `CREATE INDEX "IDX_application_city_trgm"
        ON "application" USING gin (lower("city") gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_application_city_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_application_country"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_application_city"`);
    await queryRunner.query(
      `ALTER TABLE "application" DROP COLUMN "country", DROP COLUMN "city"`,
    );
  }
}
