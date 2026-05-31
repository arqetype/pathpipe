import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgm1780266600000 implements MigrationInterface {
  name = 'EnablePgTrgm1780266600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
  }
}
