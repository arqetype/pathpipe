import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserWatchedCompanies1785139848261 implements MigrationInterface {
  name = 'AddUserWatchedCompanies1785139848261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_watched_companies_company" ("userId" uuid NOT NULL, "companyId" uuid NOT NULL, CONSTRAINT "PK_dce4c39aace25121be93b2d03df" PRIMARY KEY ("userId", "companyId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e21cc3f76892a998bf597e826" ON "user_watched_companies_company" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ac281b1570c09222d17d15e15" ON "user_watched_companies_company" ("companyId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watched_companies_company" ADD CONSTRAINT "FK_4e21cc3f76892a998bf597e8266" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watched_companies_company" ADD CONSTRAINT "FK_8ac281b1570c09222d17d15e158" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_watched_companies_company" DROP CONSTRAINT "FK_8ac281b1570c09222d17d15e158"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_watched_companies_company" DROP CONSTRAINT "FK_4e21cc3f76892a998bf597e8266"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ac281b1570c09222d17d15e15"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e21cc3f76892a998bf597e826"`,
    );
    await queryRunner.query(`DROP TABLE "user_watched_companies_company"`);
  }
}
