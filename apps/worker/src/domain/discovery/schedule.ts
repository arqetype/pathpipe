/**
 * When a source is worth reading, and how hard.
 *
 * Pure: a source's stored state, the clock, and the thresholds go in; a
 * decision comes out. No IO, no config service, no logger — which is what makes
 * the back-off curve something that can be argued about in a test rather than
 * in production.
 */

export type CycleMode = 'fast' | 'full';

/** The parts of a job source this decision actually reads. */
export interface SourceState {
  /** The listing only appears after a browser render — a cheap pass cannot reach it. */
  requiresBrowser: boolean;
  failureCount: number;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
}

export interface SchedulePolicy {
  fullIntervalHours: number;
  reconcileIntervalHours: number;
  maxFailuresBeforeBackoff: number;
}

export interface SourceDecision {
  skip: boolean;
  /** Ask the adapter for the cheap listing only. */
  fastOnly: boolean;
  /** Re-ingest even if nothing changed. */
  reconcile: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

const hoursSince = (iso: string | null, now: number): number =>
  iso ? (now - new Date(iso).getTime()) / HOUR_MS : Number.POSITIVE_INFINITY;

/**
 * How long a repeatedly failing source is left alone.
 *
 * Doubles per failure past the threshold and stops at a day: a board that has
 * been dead for a week is not worth a request every quarter hour, and a board
 * that comes back gets picked up within a day of doing so.
 */
export const backoffHours = (
  failureCount: number,
  maxFailuresBeforeBackoff: number,
): number =>
  failureCount < maxFailuresBeforeBackoff
    ? 0
    : Math.min(
        24,
        2 ** Math.min(failureCount - maxFailuresBeforeBackoff, 4),
      );

/**
 * A source is skipped entirely when it is backing off after repeated failures,
 * or when a cheap pass cannot possibly reach it (its listing only appears after
 * a browser render) and the full pass is not due yet.
 */
export const planSource = (
  source: SourceState,
  mode: CycleMode,
  now: number,
  policy: SchedulePolicy,
): SourceDecision => {
  const sinceChecked = hoursSince(source.lastCheckedAt, now);
  const dueForFull = sinceChecked >= policy.fullIntervalHours;

  const backoff = backoffHours(
    source.failureCount,
    policy.maxFailuresBeforeBackoff,
  );
  if (backoff && sinceChecked < backoff) {
    return { skip: true, fastOnly: true, reconcile: false };
  }

  if (mode === 'fast' && source.requiresBrowser && !dueForFull) {
    return { skip: true, fastOnly: true, reconcile: false };
  }

  return {
    skip: false,
    fastOnly: mode === 'fast' && !source.requiresBrowser && !dueForFull,
    // Re-ingest periodically even when nothing changed, so a posting lost to a
    // failed insert cannot stay missing forever.
    reconcile:
      hoursSince(source.lastSyncedAt, now) >= policy.reconcileIntervalHours,
  };
};

/**
 * What a scheduled seeding run asks for.
 *
 * One cheap vendor request per candidate, spread over the public feeds and the
 * companies we already know — the same budget the seeding was run with by hand.
 */
export const SCHEDULED_SEED = {
  feeds: true,
  companies: true,
  limit: 5000,
} as const;
