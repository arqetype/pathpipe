export type CycleMode = 'fast' | 'full';

export interface SourceState {
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
  fastOnly: boolean;
  reconcile: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

const hoursSince = (iso: string | null, now: number): number =>
  iso ? (now - new Date(iso).getTime()) / HOUR_MS : Number.POSITIVE_INFINITY;

export const backoffHours = (
  failureCount: number,
  maxFailuresBeforeBackoff: number,
): number =>
  failureCount < maxFailuresBeforeBackoff
    ? 0
    : Math.min(24, 2 ** Math.min(failureCount - maxFailuresBeforeBackoff, 4));

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
    reconcile:
      hoursSince(source.lastSyncedAt, now) >= policy.reconcileIntervalHours,
  };
};

export const SCHEDULED_SEED = {
  yc: true,
  feeds: true,
  companies: true,
  limit: 5000,
} as const;
