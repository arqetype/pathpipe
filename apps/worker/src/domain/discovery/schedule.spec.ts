import { SCHEDULED_SEED, backoffHours, planSource } from './schedule';
import type { SchedulePolicy, SourceState } from './schedule';

const NOW = Date.parse('2026-09-16T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const agoHours = (hours: number): string =>
  new Date(NOW - hours * HOUR).toISOString();

const policy: SchedulePolicy = {
  fullIntervalHours: 4,
  reconcileIntervalHours: 24,
  maxFailuresBeforeBackoff: 4,
};

const source = (over: Partial<SourceState> = {}): SourceState => ({
  requiresBrowser: false,
  failureCount: 0,
  lastCheckedAt: agoHours(1),
  lastSyncedAt: agoHours(1),
  ...over,
});

describe('backoffHours', () => {
  it('leaves a source alone until it has failed enough times', () => {
    expect(backoffHours(3, 4)).toBe(0);
  });

  it('doubles per failure past the threshold and stops at a day', () => {
    expect([4, 5, 6, 7, 8, 9, 20].map((n) => backoffHours(n, 4))).toEqual([
      1, 2, 4, 8, 16, 16, 16,
    ]);
  });
});

describe('planSource', () => {
  it('reads a healthy source and asks for the cheap listing on a fast pass', () => {
    expect(planSource(source(), 'fast', NOW, policy)).toEqual({
      skip: false,
      fastOnly: true,
      reconcile: false,
    });
  });

  it('asks for everything once the full interval has passed', () => {
    expect(
      planSource(source({ lastCheckedAt: agoHours(5) }), 'fast', NOW, policy)
        .fastOnly,
    ).toBe(false);
  });

  it('skips a backing-off source until its back-off has elapsed', () => {
    const failing = source({ failureCount: 6, lastCheckedAt: agoHours(3) });
    expect(planSource(failing, 'full', NOW, policy).skip).toBe(true);

    const elapsed = source({ failureCount: 6, lastCheckedAt: agoHours(5) });
    expect(planSource(elapsed, 'full', NOW, policy).skip).toBe(false);
  });

  it('skips a browser-only source on a fast pass unless a full pass is due', () => {
    expect(
      planSource(source({ requiresBrowser: true }), 'fast', NOW, policy).skip,
    ).toBe(true);
    expect(
      planSource(source({ requiresBrowser: true }), 'full', NOW, policy).skip,
    ).toBe(false);
  });

  it('re-ingests an unchanged source once the reconcile interval has passed', () => {
    expect(
      planSource(source({ lastSyncedAt: agoHours(25) }), 'full', NOW, policy)
        .reconcile,
    ).toBe(true);
  });

  it('treats a source never checked as due for everything', () => {
    expect(
      planSource(
        source({ lastCheckedAt: null, lastSyncedAt: null }),
        'fast',
        NOW,
        policy,
      ),
    ).toEqual({ skip: false, fastOnly: false, reconcile: true });
  });
});

describe('SCHEDULED_SEED', () => {
  it('reads the public feeds and the companies we already know', () => {
    expect(SCHEDULED_SEED).toEqual({
      feeds: true,
      companies: true,
      limit: 5000,
    });
  });
});
