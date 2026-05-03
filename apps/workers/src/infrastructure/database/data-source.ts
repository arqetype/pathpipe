import { DataSource } from 'typeorm';
import { RawJobListing } from '@repo/db/entities/raw-job-listing';
import { Company } from '@repo/db/entities/company';
import { CompanySuggestion } from '@repo/db/entities/company-suggestion';
import { configService } from '../config/config.service';
import { Application } from '@repo/db/entities/application';
import { User } from '@repo/db/entities/user';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty());

export function createDataSource(): DataSource {
  const dbConfig = configService.get('database');

  return new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.name,
    entities: [RawJobListing, Application, Company, CompanySuggestion, User],
    synchronize: process.env.NODE_ENV !== 'production',
  });
}

export const dataSource = createDataSource();

export async function initializeDataSource() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    logger.info('DataSource initialized');
  }
  return dataSource;
}
