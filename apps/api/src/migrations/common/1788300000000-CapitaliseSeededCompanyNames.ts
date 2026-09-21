import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the companies discovery already registered the capital it now writes.
 *
 * Discovery names a company after its ATS board token — `nvidia`,
 * `sierra-space` — and that slug is what users read on every card, filter and
 * email. The seeding route capitalises from now on; this is the stock it wrote
 * before, which nothing would otherwise revisit: a company whose board is
 * re-confirmed gets corrected on the next run, one that is not never does.
 *
 * Scoped to approved, monitored rows. That is what a discovery run writes, and
 * it leaves alone the names people typed themselves — someone who entered a
 * company in lowercase entered it that way on purpose, and their board is not
 * ours to rewrite.
 *
 * `UQ_company_name_lower` indexes `lower(btrim(name))`, which this does not
 * move, so no row can collide with another by being corrected.
 */
export class CapitaliseSeededCompanyNames1788300000000 implements MigrationInterface {
  name = 'CapitaliseSeededCompanyNames1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "company"
       SET "name" = upper(left("name", 1)) || substr("name", 2)
       WHERE "name" <> ''
         AND "name" = lower("name")
         AND "status" = 'APPROVED'
         AND "isMonitored" = true`,
    );
  }

  public async down(): Promise<void> {
    // Nothing to undo. The lowercase name a row came in with is not recorded
    // anywhere, and lowercasing every seeded company back would destroy the
    // spelling of every one that was already correct.
  }
}
