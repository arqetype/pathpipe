'use server';

import { get } from '@/lib/fetch';
import type {
  PaginatedApplications,
  ApplicationSortBy,
} from '@repo/db/query/application';
import type { ApplicationStatus } from '@repo/db/types/application/status';

interface FetchApplicationsParams {
  search?: string;
  status?: ApplicationStatus[];
  sortBy?: ApplicationSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface FetchApplicationsResult {
  result: Awaited<ReturnType<typeof get<PaginatedApplications>>>;
}

export async function fetchApplicationsAction(
  params: FetchApplicationsParams,
): Promise<FetchApplicationsResult> {
  const { search, status, sortBy, sortOrder, limit = 500 } = params;

  const query = new URLSearchParams({ limit: String(limit) });
  if (search) query.set('search', search);
  // Repeated keys, not comma-joined
  for (const value of status ?? []) query.append('status', value);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);

  const result = await get<PaginatedApplications>(
    `/applications?${query.toString()}`,
  );

  return { result };
}
