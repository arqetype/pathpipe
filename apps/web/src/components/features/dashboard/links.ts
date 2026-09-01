import { ApplicationStatus } from '@repo/db/types/application/status';
import { STRONG_MATCH_SCORE } from '@repo/db/query/dashboard';

/**
 * Where each figure on the home page lands.
 *
 * Kept in one place because each of these is a board's own filter state spelled
 * out in the URL: a tile reading "12" has to open a board already showing those
 * twelve, or the count is a dead end.
 */

const ALL_APPLICATION_STATUSES = Object.values(ApplicationStatus);

/**
 * The applications board showing only the given columns.
 *
 * The board takes the columns to *hide*, so keeping one means naming the other
 * five.
 */
export const applicationsFocused = (
  keep: ApplicationStatus[],
  view: 'kanban' | 'table' = 'table',
): string => {
  const hidden = ALL_APPLICATION_STATUSES.filter(
    (status) => !keep.includes(status),
  );
  const params = new URLSearchParams({ view });
  if (hidden.length) params.set('hidden', hidden.join(','));
  return `/app/applications?${params.toString()}`;
};

/** One application, opened in its dialog. */
export const applicationDetail = (id: string): string =>
  `/app/applications?id=${id}`;

/** The board of offers, filtered the way a figure described them. */
export const jobMatches = (
  query: Record<string, string | undefined> = {},
): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `/app/job-matches${qs ? `?${qs}` : ''}`;
};

/** One offer, opened in the board's detail pane. */
export const jobDetail = (id: string): string => jobMatches({ job: id });

export const ALL_MATCHES_URL = jobMatches({ sortBy: 'match' });

/** Offers over the score threshold with no application behind them. */
export const STRONG_MATCHES_URL = jobMatches({
  minScore: String(STRONG_MATCH_SCORE),
  tracked: 'false',
  sortBy: 'match',
});

/** Bookmarked offers with no application behind them. */
export const SAVED_UNDECIDED_URL = jobMatches({
  saved: 'true',
  tracked: 'false',
});

export const WISHLIST_URL = applicationsFocused([ApplicationStatus.WISHLIST]);

export const APPLIED_URL = applicationsFocused([ApplicationStatus.APPLIED]);

export const INTERVIEW_URL = applicationsFocused([ApplicationStatus.INTERVIEW]);

export const OFFER_URL = applicationsFocused([ApplicationStatus.OFFER]);

export const JOB_PROFILE_URL = '/app/job-profile';
