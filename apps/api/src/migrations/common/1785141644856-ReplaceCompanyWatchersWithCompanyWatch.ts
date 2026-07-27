import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceCompanyWatchersWithCompanyWatch1785141644856 implements MigrationInterface {
    name = 'ReplaceCompanyWatchersWithCompanyWatch1785141644856'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "company_watch" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "careersUrl" character varying, "website" character varying, "notes" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "companyId" uuid, CONSTRAINT "UQ_c05738fede25b3a5a298c4662a6" UNIQUE ("userId", "companyId"), CONSTRAINT "PK_11634581c19a82dc159b879b1ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "company_watch" ADD CONSTRAINT "FK_0a6d4d53f871d630be12ccf6682" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_watch" ADD CONSTRAINT "FK_dd51acdc659df1cfd1210ab8e87" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE "user_watched_companies_company"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_watched_companies_company" ("userId" uuid NOT NULL, "companyId" uuid NOT NULL, CONSTRAINT "PK_dce4c39aace25121be93b2d03df" PRIMARY KEY ("userId", "companyId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4e21cc3f76892a998bf597e826" ON "user_watched_companies_company" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ac281b1570c09222d17d15e15" ON "user_watched_companies_company" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "user_watched_companies_company" ADD CONSTRAINT "FK_4e21cc3f76892a998bf597e8266" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_watched_companies_company" ADD CONSTRAINT "FK_8ac281b1570c09222d17d15e158" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_watch" DROP CONSTRAINT "FK_dd51acdc659df1cfd1210ab8e87"`);
        await queryRunner.query(`ALTER TABLE "company_watch" DROP CONSTRAINT "FK_0a6d4d53f871d630be12ccf6682"`);
        await queryRunner.query(`DROP TABLE "company_watch"`);
    }

}
