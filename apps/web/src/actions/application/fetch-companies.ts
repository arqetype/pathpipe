'use server';

import { get } from '@/lib/fetch';

type CompanyOption = { id: string; name: string };

/**
 * Fetches a list of companies from the API.
 *
 * @param query - The search query to filter companies (optional).
 * @returns A promise resolving to an array of company options.
 */
export async function fetchCompanies(query?: string): Promise<CompanyOption[]> {
  const path = query?.trim()
    ? `/companies?query=${encodeURIComponent(query.trim())}`
    : '/companies';

  const result = await get<CompanyOption[]>(path);

  if (result.ok) {
    return result.data;
  } else {
    console.error('Failed to fetch companies:', result.response.statusText);
    throw new Error('Unable to fetch companies');
  }
}
