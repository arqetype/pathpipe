import { ApplicationStatus } from '../types/application/status';
import { ApplicationTier } from '../types/application/tier';
import type { JobPostingResponse } from './job-posting';

/**
 * The score from which an offer is worth interrupting the user for.
 *
 * Shared so the home page, the board's "Strong fit" preset and the alert mail
 * cannot drift apart on what "a good match" means.
 */
export const STRONG_MATCH_SCORE = 70;

/**
 * How long an application can stay quiet before it is worth chasing.
 *
 * Two weeks: shorter reads as impatient to most recruiters, longer and the
 * thread is cold.
 */
export const STALE_AFTER_DAYS = 14;

/** One application, reduced to what the home page shows. */
export interface DashboardApplication {
  id: string;
  position: string;
  companyName: string | null;
  url: string | null;
  status: ApplicationStatus;
  tier: ApplicationTier;
  appliedAt: string | null;
  createdAt: string;
  /**
   * Days since the last thing that happened to it.
   *
   * Counted from `appliedAt` once sent, from creation before that, so a
   * wishlist entry ages from the day the user wrote it down.
   */
  daysSince: number;
}

/** Every number the home page shows, in one payload. */
export interface DashboardStats {
  // --- the pipeline
  wishlist: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  ghosted: number;
  /** Everything on the board, closed rows included. */
  totalApplications: number;
  /** Sent, still `APPLIED`, and quiet for {@link STALE_AFTER_DAYS} days. */
  staleApplied: number;
  /** Applications sent in the last 7 days, and in the 7 days before those. */
  appliedThisWeek: number;
  appliedLastWeek: number;
  /**
   * Share of sent applications that got a reply, 0–100.
   *
   * Null until something has been sent — a rate over nothing would read as a
   * bad one.
   */
  responseRate: number | null;

  // --- the offers
  /** Open offers over {@link STRONG_MATCH_SCORE} not yet on the board. */
  strongMatches: number;
  /** Bookmarked offers with no application behind them yet. */
  savedUndecided: number;

  // --- the profile behind the scores
  hasProfile: boolean;
  /** 0–100; a low number is why the matches are weak. */
  profileCompleteness: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  /** The best open offers the user has not acted on. */
  topMatches: JobPostingResponse[];
  /** Bookmarked offers still waiting for a yes or a no. */
  savedOffers: JobPostingResponse[];
  /** Wishlist rows with no application sent. */
  wishlistApplications: DashboardApplication[];
  /** Sent applications that have gone quiet. */
  staleApplications: DashboardApplication[];
}
