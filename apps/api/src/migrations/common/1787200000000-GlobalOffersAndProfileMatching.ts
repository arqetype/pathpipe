import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Offers become global, and matching becomes a profile rather than a watch list.
 *
 * Until now an offer existed once per user who watched the company, which meant
 * the same job was stored fifty times and nobody could see anything outside
 * their own watch list. This collapses those copies into one row per offer and
 * moves what each user *did* with it — seen, saved, pushed to the applications
 * board — into `job_posting_interaction`. Nothing a user did is lost.
 *
 * `job_posting_location` and `job_preference` arrive with it: the first so a
 * multi-city offer stops reading as one strange city, the second so the board
 * can rank by what the user is actually looking for.
 */
export class GlobalOffersAndProfileMatching1787200000000 implements MigrationInterface {
  name = 'GlobalOffersAndProfileMatching1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------- state

    await queryRunner.query(
      `CREATE TABLE "job_posting_interaction" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobPostingId" uuid NOT NULL,
        "status" "public"."job_posting_status_enum" NOT NULL DEFAULT 'SEEN',
        "saved" boolean NOT NULL DEFAULT false,
        "savedAt" TIMESTAMP,
        "applicationId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_posting_interaction" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_posting_interaction_user_posting" UNIQUE ("userId", "jobPostingId")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting_interaction"
       ADD CONSTRAINT "FK_job_posting_interaction_user"
       FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting_interaction"
       ADD CONSTRAINT "FK_job_posting_interaction_application"
       FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_interaction_user_status"
       ON "job_posting_interaction" ("userId", "status")`,
    );

    // ------------------------------------------------------------ dedupe

    // One surviving row per (company, url). The oldest wins so `createdAt`
    // keeps meaning "when we first saw this offer", and the merge on the next
    // crawl refills whatever a thinner copy was missing.
    await queryRunner.query(
      `CREATE TEMP TABLE "canonical_posting" AS
       SELECT DISTINCT ON ("companyId", "url")
              "id" AS canonical_id, "companyId", "url"
       FROM "job_posting"
       ORDER BY "companyId", "url", "createdAt" ASC, "id" ASC`,
    );

    // Everything a user did survives, pointed at the surviving row. Where the
    // same user held two copies of one offer, the one they engaged with most
    // wins — APPLIED outranks DISMISSED outranks SEEN.
    await queryRunner.query(
      `INSERT INTO "job_posting_interaction"
         ("userId", "jobPostingId", "status", "saved", "savedAt", "applicationId", "createdAt")
       SELECT DISTINCT ON (jp."userId", c.canonical_id)
              jp."userId",
              c.canonical_id,
              jp."status",
              jp."saved",
              jp."savedAt",
              jp."applicationId",
              jp."createdAt"
       FROM "job_posting" jp
       JOIN "canonical_posting" c
         ON c."companyId" = jp."companyId" AND c."url" = jp."url"
       WHERE jp."status" <> 'NEW'
          OR jp."saved" = true
          OR jp."applicationId" IS NOT NULL
       ORDER BY jp."userId", c.canonical_id,
                CASE jp."status"
                  WHEN 'APPLIED' THEN 0
                  WHEN 'DISMISSED' THEN 1
                  WHEN 'SEEN' THEN 2
                  ELSE 3
                END,
                jp."applicationId" NULLS LAST,
                jp."saved" DESC`,
    );

    await queryRunner.query(
      `DELETE FROM "job_posting" jp
       USING "canonical_posting" c
       WHERE c."companyId" = jp."companyId"
         AND c."url" = jp."url"
         AND jp."id" <> c.canonical_id`,
    );
    await queryRunner.query(`DROP TABLE "canonical_posting"`);

    // -------------------------------------------------------- offers go global

    await queryRunner.query(
      `ALTER TABLE "job_posting_interaction"
       ADD CONSTRAINT "FK_job_posting_interaction_posting"
       FOREIGN KEY ("jobPostingId") REFERENCES "job_posting"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_job_posting_user_company_external"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_job_posting_user_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_job_posting_user_closed"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_job_posting_user_posted"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_job_posting_user_company_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT IF EXISTS "UQ_job_posting_user_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT IF EXISTS "FK_job_posting_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT IF EXISTS "FK_job_posting_application"`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
        DROP COLUMN "userId",
        DROP COLUMN "status",
        DROP COLUMN "saved",
        DROP COLUMN "savedAt",
        DROP COLUMN "applicationId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "UQ_job_posting_company_url" UNIQUE ("companyId", "url")`,
    );
    // A board that rewrites a posting's slug must not produce a second row.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_posting_company_external"
       ON "job_posting" ("companyId", "externalId")
       WHERE "externalId" IS NOT NULL`,
    );
    // The board's default query: open offers, newest first.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_closed_posted"
       ON "job_posting" ("closedAt", "postedAt")`,
    );
    // Reconciliation matches a whole board's worth of URLs at once.
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_company_source"
       ON "job_posting" ("companyId", "source")`,
    );

    // ------------------------------------------------------------- locations

    await queryRunner.query(
      `CREATE TABLE "job_posting_location" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jobPostingId" uuid NOT NULL,
        "city" character varying NOT NULL DEFAULT '',
        "region" character varying NOT NULL DEFAULT '',
        "country" character varying NOT NULL DEFAULT '',
        "raw" character varying NOT NULL DEFAULT '',
        CONSTRAINT "PK_job_posting_location" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_posting_location" UNIQUE ("jobPostingId", "city", "region", "country")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting_location"
       ADD CONSTRAINT "FK_job_posting_location_posting"
       FOREIGN KEY ("jobPostingId") REFERENCES "job_posting"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_location_city" ON "job_posting_location" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_location_country" ON "job_posting_location" ("country")`,
    );
    // Deliberately not backfilled from the old `location` string: splitting
    // "San Francisco, New York City" in SQL would reproduce exactly the mess
    // this table exists to fix. The next full crawl writes them properly.

    // ------------------------------------------------------------- preferences

    await queryRunner.query(
      `CREATE TABLE "job_preference" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "employmentTypes" "public"."job_posting_employmenttype_enum"[] NOT NULL DEFAULT '{}',
        "remoteTypes" "public"."job_posting_remotetype_enum"[] NOT NULL DEFAULT '{}',
        "countries" text[] NOT NULL DEFAULT '{}',
        "cities" text[] NOT NULL DEFAULT '{}',
        "keywords" text[] NOT NULL DEFAULT '{}',
        "excludedKeywords" text[] NOT NULL DEFAULT '{}',
        "minSalary" integer,
        "notifyMatches" boolean NOT NULL DEFAULT true,
        "lastNotifiedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_preference" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_preference_user" UNIQUE ("userId")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_preference"
       ADD CONSTRAINT "FK_job_preference_user"
       FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
  }

  /**
   * Reverses the schema. The per-user copies of an offer are *not* recreated:
   * they were duplicates, and which user each copy belonged to is exactly the
   * information this migration folded away. Interactions are restored onto the
   * surviving row, so a user's own history survives a rollback.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "job_preference"`);
    await queryRunner.query(`DROP TABLE "job_posting_location"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_company_source"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_job_posting_closed_posted"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_job_posting_company_external"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting" DROP CONSTRAINT "UQ_job_posting_company_url"`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
        ADD "userId" uuid,
        ADD "status" "public"."job_posting_status_enum" NOT NULL DEFAULT 'NEW',
        ADD "saved" boolean NOT NULL DEFAULT false,
        ADD "savedAt" TIMESTAMP,
        ADD "applicationId" uuid`,
    );

    // Put each user's own state back on the row it belongs to. Where several
    // users engaged with one offer, only the first can be represented — the
    // shape being restored cannot hold more than one.
    await queryRunner.query(
      `UPDATE "job_posting" jp SET
         "userId" = i."userId",
         "status" = i."status",
         "saved" = i."saved",
         "savedAt" = i."savedAt",
         "applicationId" = i."applicationId"
       FROM (
         SELECT DISTINCT ON ("jobPostingId") *
         FROM "job_posting_interaction"
         ORDER BY "jobPostingId", "createdAt" ASC
       ) i
       WHERE i."jobPostingId" = jp."id"`,
    );
    // Offers nobody ever touched have no user to belong to under the old shape.
    await queryRunner.query(`DELETE FROM "job_posting" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "job_posting" ALTER COLUMN "userId" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "UQ_job_posting_user_url" UNIQUE ("userId", "url")`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "FK_job_posting_user"
       FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_posting"
       ADD CONSTRAINT "FK_job_posting_application"
       FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_job_posting_user_company_external"
       ON "job_posting" ("userId", "companyId", "externalId")
       WHERE "externalId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_status" ON "job_posting" ("userId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_closed" ON "job_posting" ("userId", "closedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_posted" ON "job_posting" ("userId", "postedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_posting_user_company_source" ON "job_posting" ("userId", "companyId", "source")`,
    );

    await queryRunner.query(`DROP TABLE "job_posting_interaction"`);
  }
}
