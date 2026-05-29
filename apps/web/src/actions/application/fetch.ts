'use server';

import { get } from '@/lib/fetch';
import type {
  PaginatedApplications,
  ApplicationSortBy,
} from '@repo/db/query/application';

interface FetchApplicationsParams {
  search?: string;
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
  const { search, sortBy, sortOrder, limit = 500 } = params;

  const query = new URLSearchParams({ limit: String(limit) });
  if (search) query.set('search', search);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);

  const result = await get<PaginatedApplications>(
    `/applications?${query.toString()}`,
  );

  return { result };
}
