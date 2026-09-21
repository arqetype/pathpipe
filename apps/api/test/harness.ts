import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ApiKey } from '@repo/db/entities/api-key';
import { Company } from '@repo/db/entities/company';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { User } from '@repo/db/entities/user';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

import { AppModule } from '../src/app.module';
import { dedupKey } from '../src/features/job-posting/dedup-key';

/**
 * One booted API against the throwaway Postgres, plus the few things every
 * spec needs: a signed-in user, an API key for the crawler routes, and
 * fixtures written straight through TypeORM.
 *
 * Authentication is a real cookie rather than an overridden guard: the guard
 * only reads `auth-token` and checks the user is verified, so minting one is
 * three lines and keeps the guard itself under test.
 */
export interface Harness {
  app: INestApplication;
  server: Server;
  dataSource: DataSource;
  /** The signed-in user every authenticated request is made as. */
  user: User;
  /** `Cookie` header value carrying that user's JWT. */
  cookie: string;
  /** `x-api-key` value for the crawler's ingestion routes. */
  apiKey: string;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/** Tables wiped between tests; the user and their API key survive. */
const FIXTURE_TABLES = [
  'job_posting_interaction',
  'job_posting_location',
  'job_posting',
  'application',
  'company_watch',
  'company',
  'job_preference',
  'job_source',
];

export const createHarness = async (): Promise<Harness> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  // The same wiring as `main.ts`, minus the parts no test exercises.
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const dataSource = app.get(DataSource);
  const reset = async (): Promise<void> => {
    await dataSource.query(
      `TRUNCATE TABLE ${FIXTURE_TABLES.map((table) => `"${table}"`).join(
        ', ',
      )} RESTART IDENTITY CASCADE`,
    );
  };

  await dataSource.query(`TRUNCATE TABLE "api_key", "user" CASCADE`);
  await reset();

  const user = await dataSource.getRepository(User).save({
    email: 'e2e@pathpipe.test',
    password: 'not-a-real-hash',
    name: 'E2E User',
    email_verified: true,
  });

  const apiKey = 'pk_e2e_key';
  await dataSource.getRepository(ApiKey).save({
    key: apiKey,
    name: 'e2e',
    user,
    isActive: true,
  });

  const cookie = `auth-token=${app
    .get(JwtService)
    .sign(
      { email: user.email },
      { secret: process.env.NEST_JWT_SECRET, expiresIn: '1h' },
    )}`;

  return {
    app,
    server: app.getHttpServer() as Server,
    dataSource,
    user,
    cookie,
    apiKey,
    reset,
    close: () => app.close(),
  };
};

/** GET as the signed-in user, asserting the status and typing the body. */
export const getAs = async <T>(
  harness: Harness,
  path: string,
  status = 200,
): Promise<T> => {
  const response = await request(harness.server)
    .get(path)
    .set('Cookie', harness.cookie)
    .expect(status);
  return response.body as T;
};

/** A company, named so failures read as the fixture that caused them. */
export const seedCompany = (
  harness: Harness,
  name: string,
  industry: CompanyIndustry | null = null,
): Promise<Company> =>
  harness.dataSource
    .getRepository(Company)
    .save({ name, industry: industry ?? undefined });

/** Everything a fixture offer can say. Anything left out is "the board did not say". */
export interface JobFixture {
  companyId: string;
  title: string;
  url: string;
  externalId?: string;
  description?: string;
  department?: string;
  location?: string;
  places?: Array<{ city?: string; country?: string; region?: string }>;
  domain?: WorkDomain;
  seniority?: SeniorityLevel;
  employmentType?: EmploymentType;
  remoteType?: RemoteType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source?: string;
  postedAt?: Date;
  validThrough?: Date;
  closedAt?: Date;
}

/**
 * Writes one offer exactly as described.
 *
 * Board and scoring specs build their fixtures here rather than through the
 * ingestion route: they are about what a *stored* offer does, and the route
 * cannot even store some of these columns (see the ingestion spec).
 */
export const seedJob = async (
  harness: Harness,
  fixture: JobFixture,
): Promise<JobPosting> => {
  const job = await harness.dataSource.getRepository(JobPosting).save({
    title: fixture.title,
    url: fixture.url,
    externalId: fixture.externalId ?? null,
    description: fixture.description ?? null,
    department: fixture.department ?? null,
    location: fixture.location ?? null,
    domain: fixture.domain ?? null,
    seniority: fixture.seniority ?? null,
    employmentType: fixture.employmentType ?? null,
    remoteType: fixture.remoteType ?? null,
    salaryMin: fixture.salaryMin ?? null,
    salaryMax: fixture.salaryMax ?? null,
    salaryCurrency: fixture.salaryCurrency ?? null,
    source: fixture.source ?? 'https://boards.example.com',
    postedAt: fixture.postedAt ?? new Date('2026-01-01T00:00:00Z'),
    validThrough: fixture.validThrough ?? null,
    closedAt: fixture.closedAt ?? null,
    lastSeenAt: new Date(),
    companyId: fixture.companyId,
    dedupKey: dedupKey({
      title: fixture.title,
      url: fixture.url,
      companyId: fixture.companyId,
      location: fixture.location,
      locations: fixture.places?.map((place) => ({
        city: place.city ?? null,
        region: place.region ?? null,
        country: place.country ?? null,
      })),
    }),
  });

  for (const place of fixture.places ?? []) {
    await harness.dataSource.getRepository(JobPostingLocation).save({
      jobPostingId: job.id,
      city: place.city ?? '',
      region: place.region ?? '',
      country: place.country ?? '',
      raw: [place.city, place.country].filter(Boolean).join(', '),
    });
  }

  return job;
};
