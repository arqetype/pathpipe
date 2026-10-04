import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropApiKey1788400000000 implements MigrationInterface {
  name = 'DropApiKey1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "api_key"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" text NOT NULL, "name" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "user_id" uuid, CONSTRAINT "UQ_fb080786c16de6ace7ed0b69f7d" UNIQUE ("key"), CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ADD CONSTRAINT "FK_6a0830f03e537b239a53269b27d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
