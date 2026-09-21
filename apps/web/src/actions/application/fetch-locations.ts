'use server';

import { get } from '@/lib/fetch';
import type { LocationSuggestion } from '@repo/db/query/application';

export async function fetchLocationSuggestionsAction(
  query?: string,
): Promise<LocationSuggestion[]> {
  const path = query?.trim()
    ? `/applications/locations?query=${encodeURIComponent(query.trim())}`
    : '/applications/locations';

  const result = await get<LocationSuggestion[]>(path);
  return result.ok ? result.data : [];
}
