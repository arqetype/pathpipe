'use server';

import { get } from '@/lib/fetch';
import { CompanySearchResult } from '@repo/db/query/company';

export async function fetchCompaniesSuggestionsAction(
  query?: string,
): Promise<CompanySearchResult[]> {
  const path = query?.trim()
    ? `/companies/suggestions?query=${encodeURIComponent(query.trim())}`
    : '/companies/suggestions';

  const result = await get<CompanySearchResult[]>(path);

  if (result.ok) {
    return result.data;
  } else {
    throw new Error('Unable to fetch companies');
  }
}
