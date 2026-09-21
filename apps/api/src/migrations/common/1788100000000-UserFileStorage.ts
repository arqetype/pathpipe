import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One place for every document a job search needs.
 *
 * The bytes live in Postgres rather than an object store: a user's entire
 * corpus — CVs, cover letters, diplomas, certificates — is a few megabytes,
 * and a row that is backed up, restored and deleted along with the account it
 * belongs to is worth more than the storage it costs. PDF only, enforced by
 * reading the file's first bytes rather than believing its name.
 *
 * An application then points at two of these rows instead of holding copies,
 * so "which CV did I send them?" stays answerable months later.
 */
export class UserFileStorage1788100000000 implements MigrationInterface {
  name = 'UserFileStorage1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_file_kind_enum" AS ENUM('RESUME', 'COVER_LETTER', 'DIPLOMA', 'CERTIFICATE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_file" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "kind" "public"."user_file_kind_enum" NOT NULL,
        "name" character varying NOT NULL,
        "filename" character varying NOT NULL,
        "byteSize" integer NOT NULL,
        "storedSize" integer NOT NULL,
        "content" bytea NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_file" PRIMARY KEY ("id")
      )`,
    );
    // The picker on an application asks for one user's files of one kind, and
    // nothing else ever reads this table without a user.
    await queryRunner.query(
      `CREATE INDEX "IDX_user_file_user_kind" ON "user_file" ("userId", "kind")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_file"
        ADD CONSTRAINT "FK_user_file_user" FOREIGN KEY ("userId")
        REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The file arrives already gzipped, so leaving TOAST to attempt pglz on it
    // spends CPU on every insert to achieve nothing. EXTERNAL keeps the
    // out-of-line storage and drops the second compression pass.
    await queryRunner.query(
      `ALTER TABLE "user_file" ALTER COLUMN "content" SET STORAGE EXTERNAL`,
    );

    await queryRunner.query(
      `ALTER TABLE "application"
        ADD "resumeFileId" uuid,
        ADD "coverLetterFileId" uuid`,
    );
    // SET NULL rather than CASCADE: deleting a CV must not delete the
    // applications that were sent with it.
    await queryRunner.query(
      `ALTER TABLE "application"
        ADD CONSTRAINT "FK_application_resume_file" FOREIGN KEY ("resumeFileId")
        REFERENCES "user_file"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_application_cover_letter_file" FOREIGN KEY ("coverLetterFileId")
        REFERENCES "user_file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application"
        DROP CONSTRAINT "FK_application_cover_letter_file",
        DROP CONSTRAINT "FK_application_resume_file"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application"
        DROP COLUMN "coverLetterFileId",
        DROP COLUMN "resumeFileId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_file" DROP CONSTRAINT "FK_user_file_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_file_user_kind"`);
    await queryRunner.query(`DROP TABLE "user_file"`);
    await queryRunner.query(`DROP TYPE "public"."user_file_kind_enum"`);
  }
}
