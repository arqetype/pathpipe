'use server';

import { post } from '@/lib/fetch';

import type { CompaniesQuery } from '@repo/db/query/company';
import { revalidatePath } from 'next/cache';

interface ExportResult {
  success: boolean;
  data?: { data: string };
  error?: string;
}

export const exportCsvAction = async (
  query: CompaniesQuery,
): Promise<ExportResult> => {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);
  if (query.industry) params.set('industry', query.industry as string);
  if (query.status) params.set('status', query.status as string);

  const { ok, data } = await post<{ data: string }>(
    `/companies/export?${params.toString()}`,
    {},
  );

  if (!ok) {
    return {
      success: false,
      error: (data?.message as string) || data?.error || 'Export failed',
    };
  }

  revalidatePath('/app/companies');

  return {
    success: true,
    data,
  };
};
