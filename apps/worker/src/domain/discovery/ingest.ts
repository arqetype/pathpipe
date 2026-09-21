import { apiClient } from '@/infrastructure/api/api.client';
import type { DiscoveryResult } from './types';
import type { Logger } from 'pino';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

interface BatchResponse {
  inserted: number;
  total: number;
  jobs: Array<{ id: string }>;
}

const SUBMIT_CHUNK_SIZE = 150;

const asEnum = <T extends Record<string, string>>(
  members: T,
  value: string | undefined,
): T[keyof T] | null =>
  value && value in members ? (value as T[keyof T]) : null;

export const ingestListing = async (
  company: { companyId: string; companyName: string },
  result: DiscoveryResult,
  source: string,
  logger: Logger,
): Promise<number> => {
  const live = result.jobs;

  const dtos: CreateJobPostingDto[] = live.map((job) => ({
    title: job.title,
    url: job.url,
    externalId: job.externalId ?? null,
    description: job.description ?? null,
    descriptionHtml: job.descriptionHtml ?? null,
    location: job.location ?? null,
    locations: (job.parsedLocations ?? []).map((place) => ({
      city: place.city,
      region: place.region,
      country: place.country,
      raw: place.raw,
    })),
    department: job.department ?? null,
    domain: asEnum(WorkDomain, job.domain),
    seniority: asEnum(SeniorityLevel, job.seniority),
    employmentType: asEnum(EmploymentType, job.employmentType),
    remoteType: asEnum(RemoteType, job.remoteType),
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    source,
    postedAt: job.postedAt ?? null,
    validThrough: job.validThrough ?? null,
    companyId: company.companyId,
  }));

  let inserted = 0;
  let total = 0;
  for (let start = 0; start < dtos.length; start += SUBMIT_CHUNK_SIZE) {
    const chunk = dtos.slice(start, start + SUBMIT_CHUNK_SIZE);
    try {
      const response = await apiClient.post<BatchResponse>(
        '/job-postings/internal/batch',
        chunk,
      );
      inserted += response.jobs.length;
      total += response.total;
    } catch (err) {
      logger.error(
        { company: company.companyName, err },
        'Failed to submit jobs to API',
      );
    }
  }

  // Never reconcile a partial listing.
  if (!result.partial) {
    try {
      await apiClient.post('/internal/v1/job-postings/reconcile', {
        companyId: company.companyId,
        source,
        urls: live.map((job) => job.url),
        externalIds: live
          .map((job) => job.externalId)
          .filter((id): id is string => Boolean(id)),
      });
    } catch (err) {
      logger.warn(
        { company: company.companyName, err },
        'Failed to reconcile closed postings',
      );
    }
  }

  if (inserted) {
    logger.info(
      {
        company: company.companyName,
        inserted,
        total,
        platform: result.platform,
        strategy: result.strategy,
      },
      'New offers ingested',
    );
  }

  return inserted;
};
