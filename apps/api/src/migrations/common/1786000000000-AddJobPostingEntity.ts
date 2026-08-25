import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobPostingEntity1786000000000 implements MigrationInterface {
  name = 'AddJobPostingEntity1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."job_posting_status_enum" AS ENUM('NEW', 'SEEN', 'APPLIED', 'DISMISSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_posting" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "url" character varying NOT NULL,
        "description" text,
        "location" character varying,
        "salaryMin" integer,
        "salaryMax" integer,
        "status" "public"."job_posting_status_enum" NOT NULL DEFAULT 'NEW',
        "source" character varying,
        "postedAt" TIMESTAMP,
        "companyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_job_posting_user_url" UNIQUE ("userId", "url"),
        CONSTRAINT "PK_job_posting" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD CONSTRAINT "FK_job_posting_company" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD CONSTRAINT "FK_job_posting_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT "FK_job_posting_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT "FK_job_posting_company"`,
    );
    await queryRunner.query(`DROP TABLE "job_posting"`);
    await queryRunner.query(`DROP TYPE "public"."job_posting_status_enum"`);
  }
}
