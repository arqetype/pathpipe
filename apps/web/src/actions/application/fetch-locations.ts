'use server';

import { get } from '@/lib/fetch';
import type { LocationSuggestion } from '@repo/db/query/application';

/**
 * Places to offer while somebody types a location.
 *
 * Returns an empty list rather than throwing: an autocomplete that cannot reach
 * the server should quietly let the user type their own answer, not break the
 * form around it.
 */
export async function fetchLocationSuggestionsAction(
  query?: string,
): Promise<LocationSuggestion[]> {
  const path = query?.trim()
    ? `/applications/locations?query=${encodeURIComponent(query.trim())}`
    : '/applications/locations';

  const result = await get<LocationSuggestion[]>(path);
  return result.ok ? result.data : [];
}
