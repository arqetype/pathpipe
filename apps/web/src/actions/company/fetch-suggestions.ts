'use server';

import { get } from '@/lib/fetch';
import { CompanySearchResult } from '@repo/db/query/company';

/**
 * Fetches a list of companies from the API.
 *
 * @param query - The search query to filter companies (optional).
 * @returns A promise resolving to an array of company options.
 */
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
