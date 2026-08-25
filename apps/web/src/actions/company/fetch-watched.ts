'use server';

import { get } from '@/lib/fetch';
import { WatchedCompany } from '@repo/db/query/company';

export async function fetchWatchedCompaniesAction(): Promise<WatchedCompany[]> {
  const result = await get<WatchedCompany[]>('/companies/watched');

  if (!result.ok) throw new Error('Unable to fetch watched companies');

  return result.data;
}
