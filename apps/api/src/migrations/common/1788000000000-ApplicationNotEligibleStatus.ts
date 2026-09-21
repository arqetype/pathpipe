import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A place to park jobs the user cannot apply for.
 *
 * Rejection and ghosting both describe what the employer did; a role asking for
 * five years or refusing to sponsor a visa is ruled out before anything is
 * sent. Filing those under `REJECTED` would sink the response rate with
 * applications that were never made, so they get a column of their own.
 */
export class ApplicationNotEligibleStatus1788000000000 implements MigrationInterface {
  name = 'ApplicationNotEligibleStatus1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."application_status_enum" ADD VALUE IF NOT EXISTS 'NOT_ELIGIBLE'`,
    );
  }

  public down(): Promise<void> {
    // Postgres cannot drop an enum value, and rebuilding the type would mean
    // deciding what to do with the rows already parked here — silently moving
    // someone's board is worse than leaving an unused value behind.
    throw new Error(
      'ApplicationNotEligibleStatus cannot be reverted: dropping an enum value would discard the applications using it.',
    );
  }
}
