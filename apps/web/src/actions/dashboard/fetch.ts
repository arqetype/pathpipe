'use server';

import { get } from '@/lib/fetch';
import type { DashboardResponse } from '@repo/db/query/dashboard';

/**
 * What the home page shows when the API cannot be reached.
 *
 * Zeroes rather than an error page: the navigation and the calls to action stay
 * usable, and every tile simply reads as empty.
 */
const EMPTY: DashboardResponse = {
  stats: {
    wishlist: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0,
    totalApplications: 0,
    staleApplied: 0,
    appliedThisWeek: 0,
    appliedLastWeek: 0,
    responseRate: null,
    strongMatches: 0,
    savedUndecided: 0,
    hasProfile: false,
    profileCompleteness: 0,
  },
  topMatches: [],
  savedOffers: [],
  wishlistApplications: [],
  staleApplications: [],
};

export async function fetchDashboardAction(): Promise<DashboardResponse> {
  const result = await get<DashboardResponse>('/dashboard');
  if (!result.ok) return EMPTY;
  return result.data;
}
