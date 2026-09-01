import { EmploymentType } from '../../types/job-posting/employment-type';
import { RemoteType } from '../../types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '../../types/job-posting/work-domain';

/** One place an offer is open in, already resolved by the worker. */
export class JobPostingLocationDto {
  city?: string | null;
  region?: string | null;
  /** ISO 3166-1 alpha-2. */
  country?: string | null;
  raw?: string | null;
}

/**
 * One scraped offer as the worker submits it.
 *
 * Sent in batches on an internal, API-key protected route, so it stays a plain
 * shape: the array body bypasses the global ValidationPipe anyway.
 */
export class CreateJobPostingDto {
  title: string;
  url: string;
  /** Stable id from the source ATS, when it exposes one. */
  externalId?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  /** One label for the whole set of places, for display. */
  location?: string | null;
  /** Every place the board named, one entry each. */
  locations?: JobPostingLocationDto[];
  department?: string | null;
  domain?: WorkDomain | null;
  seniority?: SeniorityLevel | null;
  employmentType?: EmploymentType | null;
  remoteType?: RemoteType | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  source?: string | null;
  postedAt?: string | null;
  validThrough?: string | null;
  companyId: string;
}
