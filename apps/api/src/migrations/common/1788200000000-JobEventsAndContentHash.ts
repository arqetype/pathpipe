import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Three things, all about not redoing work and not losing history.
 *
 *   - `job_event`, the append-only log the status columns become a cache of;
 *   - `job_posting."contentHash"`, so an unchanged offer costs one timestamp
 *     write per crawl instead of a full row rewrite;
 *   - a trigram index on `dedupKey`, so the near-miss pass that catches
 *     "Senior Backend Engineer" against "Sr Backend Engineer" is an index
 *     lookup rather than a scan of the company's whole board.
 *
 * The backfill matters as much as the table. A board left with an empty
 * timeline beside a status of REJECTED would say the log is decorative; it is
 * not. Every event we can date honestly is seeded, and the ones we cannot are
 * dated from the row's last edit, which is the truest thing on file.
 */
export class JobEventsAndContentHash1788200000000 implements MigrationInterface {
  name = 'JobEventsAndContentHash1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "job_event_type_enum" AS ENUM (
         'POSTING_VIEWED', 'POSTING_SAVED', 'POSTING_UNSAVED', 'POSTING_DISMISSED',
         'APPLICATION_CREATED', 'APPLICATION_SENT', 'FOLLOW_UP_SENT',
         'INTERVIEW_SCHEDULED', 'OFFER_RECEIVED', 'REJECTION_RECEIVED', 'MARKED_GHOSTED'
       )`,
    );

    await queryRunner.query(
      `CREATE TABLE "job_event" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "type" "job_event_type_enum" NOT NULL,
         "occurredAt" TIMESTAMP NOT NULL,
         "userId" uuid NOT NULL,
         "jobPostingId" uuid,
         "applicationId" uuid,
         "payload" jsonb,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_job_event" PRIMARY KEY ("id")
       )`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_event"
       ADD CONSTRAINT "FK_job_event_user"
       FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    // SET NULL, not CASCADE: deduplication deletes the losing copy of an offer,
    // and the user's history of it has to outlive that merge.
    await queryRunner.query(
      `ALTER TABLE "job_event"
       ADD CONSTRAINT "FK_job_event_posting"
       FOREIGN KEY ("jobPostingId") REFERENCES "job_posting"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_event"
       ADD CONSTRAINT "FK_job_event_application"
       FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_job_event_user_occurred" ON "job_event" ("userId", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_event_application_occurred" ON "job_event" ("applicationId", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_event_posting_type" ON "job_event" ("jobPostingId", "type")`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting" ADD COLUMN "contentHash" text`,
    );
    // Left NULL for existing rows on purpose: a null hash never equals an
    // incoming one, so every posting is merged in full exactly once and carries
    // a real hash from then on. Backfilling it here would mean a second copy of
    // the digest rules in SQL, free to drift from the one the API writes.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_dedup_trgm"
       ON "job_posting" USING gin ("dedupKey" gin_trgm_ops)`,
    );

    // Seen: the interaction row itself is the record that the user opened it.
    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "jobPostingId")
       SELECT 'POSTING_VIEWED', i."createdAt", i."userId", i."jobPostingId"
       FROM "job_posting_interaction" i`,
    );
    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "jobPostingId")
       SELECT 'POSTING_SAVED', COALESCE(i."savedAt", i."createdAt"), i."userId", i."jobPostingId"
       FROM "job_posting_interaction" i
       WHERE i."saved" = true`,
    );
    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "jobPostingId")
       SELECT 'POSTING_DISMISSED', i."updatedAt", i."userId", i."jobPostingId"
       FROM "job_posting_interaction" i
       WHERE i."status" = 'DISMISSED'`,
    );

    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "applicationId")
       SELECT 'APPLICATION_CREATED', a."created_at", a."userId", a."id"
       FROM "application" a
       WHERE a."deleted_at" IS NULL AND a."userId" IS NOT NULL`,
    );
    // WISHLIST is the only status that does not imply the application went out.
    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "applicationId")
       SELECT 'APPLICATION_SENT', COALESCE(a."appliedAt", a."created_at"), a."userId", a."id"
       FROM "application" a
       WHERE a."deleted_at" IS NULL AND a."userId" IS NOT NULL
         AND a."status" <> 'WISHLIST'`,
    );
    // The terminal statuses, dated from the last edit — we never recorded when
    // the answer came, and the last edit is the closest honest guess.
    await queryRunner.query(
      `INSERT INTO "job_event" ("type", "occurredAt", "userId", "applicationId", "payload")
       SELECT CASE a."status"
                WHEN 'INTERVIEW' THEN 'INTERVIEW_SCHEDULED'
                WHEN 'OFFER' THEN 'OFFER_RECEIVED'
                WHEN 'REJECTED' THEN 'REJECTION_RECEIVED'
                WHEN 'GHOSTED' THEN 'MARKED_GHOSTED'
              END::"job_event_type_enum",
              a."updated_at", a."userId", a."id",
              '{"backfilled": true}'::jsonb
       FROM "application" a
       WHERE a."deleted_at" IS NULL AND a."userId" IS NOT NULL
         AND a."status" IN ('INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_job_posting_dedup_trgm"`);
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP COLUMN "contentHash"`,
    );
    await queryRunner.query(`DROP TABLE "job_event"`);
    await queryRunner.query(`DROP TYPE "job_event_type_enum"`);
  }
}
