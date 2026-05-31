import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1780262890296 implements MigrationInterface {
  name = 'InitialSchema1780262890296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."company_industry_enum" AS ENUM('ADVERTISING', 'AEROSPACE', 'AGRICULTURE', 'AI', 'AIRLINES', 'ART', 'AUTOMOTIVE', 'BANKING', 'BIOTECHNOLOGY', 'BLOCKCHAIN', 'CHEMICALS', 'CLOUD_COMPUTING', 'CONSUMER_GOODS', 'CYBERSECURITY', 'EDUCATION', 'ENERGY', 'ENTERTAINMENT', 'FASHION', 'FINANCE', 'FOOD_AND_BEVERAGE', 'GAMING', 'GOVERNMENT', 'HEALTHCARE', 'HOSPITALITY', 'INSURANCE', 'INTERNET', 'LEGAL', 'LOGISTICS', 'MANUFACTURING', 'MEDIA', 'MINING', 'NON_PROFIT', 'PHARMACEUTICALS', 'REAL_ESTATE', 'RETAIL', 'ROBOTICS', 'SEMICONDUCTORS', 'SOFTWARE', 'SPACE', 'SPORTS', 'TELECOMMUNICATIONS', 'TRANSPORTATION', 'TRAVEL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."company_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "company" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "logoUrl" character varying, "logoBlob" bytea, "logoMimeType" character varying, "website" character varying, "careersUrl" character varying, "industry" "public"."company_industry_enum", "country" character varying, "status" "public"."company_status_enum" NOT NULL DEFAULT 'PENDING', "isMonitored" boolean NOT NULL DEFAULT false, "lastCheckedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_a76c5cd486f7779bd9c319afd27" UNIQUE ("name"), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('STANDARD', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'STANDARD', "avatar_url" character varying, "google_id" character varying, "is_google_user" boolean NOT NULL DEFAULT false, "linkedin_id" character varying, "is_linkedin_user" boolean NOT NULL DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "need_otp" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used" boolean NOT NULL DEFAULT false, "lastEmailSent" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_77b04d285509a2e6f5f44598be" UNIQUE ("userId"), CONSTRAINT "PK_8a4ba9e58712768183e862529f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_verification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "otp" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "lastSent" TIMESTAMP, "userId" uuid, CONSTRAINT "REL_527400337df1fb6a0f021c1341" UNIQUE ("userId"), CONSTRAINT "PK_090ea63a8ef4f33b1a5f29924f8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reset_password_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "lastSent" TIMESTAMP, "userId" uuid, CONSTRAINT "REL_3fde3055d9d16236c05d030915" UNIQUE ("userId"), CONSTRAINT "PK_c6f6eb8f5c88ac0233eceb8d385" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."application_status_enum" AS ENUM('WISHLIST', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."application_tier_enum" AS ENUM('S_TIER', 'A_TIER', 'B_TIER', 'NONE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "application" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "position" character varying NOT NULL, "kanbanOrder" integer, "url" character varying, "salaryMin" integer, "salaryMax" integer, "status" "public"."application_status_enum" NOT NULL DEFAULT 'WISHLIST', "tier" "public"."application_tier_enum" NOT NULL DEFAULT 'NONE', "notes" character varying, "contactName" character varying, "contactEmail" character varying, "appliedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "companyId" uuid, "userId" uuid, CONSTRAINT "PK_569e0c3e863ebdf5f2408ee1670" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" text NOT NULL, "name" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "user_id" uuid, CONSTRAINT "UQ_fb080786c16de6ace7ed0b69f7d" UNIQUE ("key"), CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_token" ADD CONSTRAINT "FK_77b04d285509a2e6f5f44598be4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verification" ADD CONSTRAINT "FK_527400337df1fb6a0f021c1341d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password_token" ADD CONSTRAINT "FK_3fde3055d9d16236c05d030915e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_4dfab138650afce0bc453ca09f7" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" ADD CONSTRAINT "FK_b4ae3fea4a24b4be1a86dacf8a2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ADD CONSTRAINT "FK_6a0830f03e537b239a53269b27d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_key" DROP CONSTRAINT "FK_6a0830f03e537b239a53269b27d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_b4ae3fea4a24b4be1a86dacf8a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application" DROP CONSTRAINT "FK_4dfab138650afce0bc453ca09f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password_token" DROP CONSTRAINT "FK_3fde3055d9d16236c05d030915e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_verification" DROP CONSTRAINT "FK_527400337df1fb6a0f021c1341d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_token" DROP CONSTRAINT "FK_77b04d285509a2e6f5f44598be4"`,
    );
    await queryRunner.query(`DROP TABLE "api_key"`);
    await queryRunner.query(`DROP TABLE "application"`);
    await queryRunner.query(`DROP TYPE "public"."application_tier_enum"`);
    await queryRunner.query(`DROP TYPE "public"."application_status_enum"`);
    await queryRunner.query(`DROP TABLE "reset_password_token"`);
    await queryRunner.query(`DROP TABLE "otp_verification"`);
    await queryRunner.query(`DROP TABLE "email_verification_token"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TYPE "public"."company_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."company_industry_enum"`);
  }
}
