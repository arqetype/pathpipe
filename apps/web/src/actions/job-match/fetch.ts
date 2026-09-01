'use server';

import { get } from '@/lib/fetch';
import type {
  JobPostingResponse,
  JobPostingsQuery,
  PaginatedJobPostings,
} from '@repo/db/query/job-posting';

export type JobMatchItem = JobPostingResponse;
export type JobMatchPage = PaginatedJobPostings;

const EMPTY_PAGE: JobMatchPage = {
  data: [],
  total: 0,
  page: 1,
  limit: 25,
  facets: {
    companies: [],
    cities: [],
    countries: [],
    departments: [],
    employmentTypes: [],
    remoteTypes: [],
  },
  newCount: 0,
  hasProfile: false,
};

/** Repeated keys are how the API receives a multi-value filter. */
const toSearchParams = (query: JobPostingsQuery): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) if (entry !== '') params.append(key, entry);
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
};

export async function fetchJobMatchesAction(
  query: JobPostingsQuery = {},
): Promise<JobMatchPage> {
  const qs = toSearchParams(query);
  const result = await get<JobMatchPage>(`/job-postings${qs ? `?${qs}` : ''}`);
  // A failed load must not blank the page: the filter bar stays usable and the
  // list simply shows as empty.
  if (!result.ok) return EMPTY_PAGE;
  return result.data;
}

export async function fetchJobMatchAction(
  id: string,
): Promise<JobMatchItem | null> {
  const result = await get<JobMatchItem>(`/job-postings/${id}`);
  if (!result.ok) return null;
  return result.data;
}

export async function countNewJobMatchesAction(): Promise<number> {
  const result = await get<{ count: number }>('/job-postings/count');
  if (!result.ok) return 0;
  return result.data.count;
}
