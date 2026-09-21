import { ApplicationStatus } from '@repo/db/types/application/status';
import { STRONG_MATCH_SCORE } from '@repo/db/query/dashboard';

const ALL_APPLICATION_STATUSES = Object.values(ApplicationStatus);

// Board takes hidden, not kept
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

export const applicationDetail = (id: string): string =>
  `/app/applications?id=${id}`;

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

export const jobDetail = (id: string): string => jobMatches({ job: id });

export const ALL_MATCHES_URL = jobMatches({ sortBy: 'match' });

export const STRONG_MATCHES_URL = jobMatches({
  minScore: String(STRONG_MATCH_SCORE),
  tracked: 'false',
  sortBy: 'match',
});

export const SAVED_UNDECIDED_URL = jobMatches({
  saved: 'true',
  tracked: 'false',
});

export const WISHLIST_URL = applicationsFocused([ApplicationStatus.WISHLIST]);

export const APPLIED_URL = applicationsFocused([ApplicationStatus.APPLIED]);

export const INTERVIEW_URL = applicationsFocused([ApplicationStatus.INTERVIEW]);

export const OFFER_URL = applicationsFocused([ApplicationStatus.OFFER]);

export const JOB_PROFILE_URL = '/app/job-profile';
