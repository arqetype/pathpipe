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

/**
 * Writing a board's listing to the API.
 *
 * Kept away from the worker's scheduling: everything here is about what our own
 * API is told, not about when a board is read.
 */

interface BatchResponse {
  inserted: number;
  total: number;
  jobs: Array<{ id: string }>;
}

/**
 * Postings per HTTP request to the API. A full board's descriptions can run
 * several megabytes; chunking keeps each request well under any reasonable
 * body-size limit regardless of how large a single company's listing gets.
 */
const SUBMIT_CHUNK_SIZE = 150;

/** The worker emits enum values as strings; only known ones reach the API. */
const asEnum = <T extends Record<string, string>>(
  members: T,
  value: string | undefined,
): T[keyof T] | null =>
  value && value in members ? (value as T[keyof T]) : null;

/** Writes one board's listing for the company behind it, and returns new offers. */
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
      // A later chunk failing should not lose the ones that already landed.
    }
  }

  // The board is the authority on what is still open: anything stored for
  // this company and source that the board no longer lists has been taken
  // down. Only a complete listing may say that — a truncated one would close
  // half the board.
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
