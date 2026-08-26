import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobSourceAndExternalId1786500000000 implements MigrationInterface {
  name = 'AddJobSourceAndExternalId1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "job_source" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "url" character varying NOT NULL,
        "platform" character varying,
        "strategy" character varying,
        "etag" character varying,
        "lastModified" character varying,
        "contentHash" character varying,
        "jobCount" integer NOT NULL DEFAULT 0,
        "requiresBrowser" boolean NOT NULL DEFAULT false,
        "failureCount" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "lastCheckedAt" TIMESTAMP,
        "lastChangedAt" TIMESTAMP,
        "lastSyncedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_job_source_url" UNIQUE ("url"),
        CONSTRAINT "PK_job_source" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_source_last_checked" ON "job_source" ("lastCheckedAt")`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD "externalId" character varying`,
    );
    // A board that rewrites a posting's slug must not produce a second row.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_posting_user_company_external"
       ON "job_posting" ("userId", "companyId", "externalId")
       WHERE "externalId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_status" ON "job_posting" ("userId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_user_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_job_posting_user_company_external"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP COLUMN "externalId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_source_last_checked"`,
    );
    await queryRunner.query(`DROP TABLE "job_source"`);
  }
}
