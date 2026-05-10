'use server';

import { get } from '@/lib/fetch';
import type { PaginatedCompanies } from '@repo/db/query/company';
import { CompanyStatus } from '@repo/db/entities/company';

interface FetchCompaniesParams {
  status?: CompanyStatus;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  industry?: string;
}

interface FetchCompaniesResult {
  result: Awaited<ReturnType<typeof get<PaginatedCompanies>>>;
  statusCounts: Record<CompanyStatus, number>;
}

export async function fetchCompaniesAction(
  params: FetchCompaniesParams,
): Promise<FetchCompaniesResult> {
  const {
    status = CompanyStatus.PENDING,
    page = 1,
    limit = 20,
    search,
    sortBy,
    sortOrder,
    industry,
  } = params;

  const query = new URLSearchParams();
  query.set('status', status);
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (search) query.set('search', search);
  if (sortBy) query.set('sortBy', sortBy);
  if (sortOrder) query.set('sortOrder', sortOrder);
  if (industry) query.set('industry', industry);

  const [result, statusCountsResult] = await Promise.all([
    get<PaginatedCompanies>(`/companies?${query.toString()}`),
    get<PaginatedCompanies>('/companies?limit=1'),
  ]);

  const statusCounts: Record<CompanyStatus, number> = statusCountsResult.ok
    ? statusCountsResult.data.totalCounts
    : {
        [CompanyStatus.PENDING]: 0,
        [CompanyStatus.APPROVED]: 0,
        [CompanyStatus.REJECTED]: 0,
      };

  return { result, statusCounts };
}
