import { runDiscoveryCycle } from './cycle';
import type { DiscoveryCycleDeps, JobSource } from './cycle';
import type { DiscoveryResult } from './types';

/** A source that is due for a full read and has never failed. */
const source = (over: Partial<JobSource> = {}): JobSource => ({
  url: 'https://job-boards.greenhouse.io/acme',
  platform: 'greenhouse',
  strategy: null,
  etag: null,
  lastModified: null,
  contentHash: null,
  jobCount: 0,
  requiresBrowser: false,
  failureCount: 0,
  lastCheckedAt: null,
  lastChangedAt: null,
  lastSyncedAt: null,
  companies: [{ companyId: 'c1', companyName: 'Acme' }],
  ...over,
});

const deps = (
  result: DiscoveryResult,
  sources: JobSource[] = [source()],
): DiscoveryCycleDeps & { saved: Array<Record<string, unknown>> } => {
  const saved: Array<Record<string, unknown>> = [];
  return {
    saved,
    sources: {
      list: () => Promise.resolve(sources),
      saveState: (url, patch) => {
        saved.push({ url, ...patch });
        return Promise.resolve();
      },
      notifyNewOffers: () => Promise.resolve(),
      expireDatedOffers: () => Promise.resolve(0),
    },
    discover: () => Promise.resolve(result),
    ingest: () => Promise.resolve(result.jobs.length),
    http: { beginCycle: () => {}, pausedHosts: () => [] },
    limit: (task) => task(),
    policy: {
      fullIntervalHours: 4,
      reconcileIntervalHours: 24,
      maxFailuresBeforeBackoff: 4,
    },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  };
};

describe('runDiscoveryCycle', () => {
  it('ingests a listing and records the new fingerprint', async () => {
    const d = deps({
      jobs: [{ title: 'Engineer', url: 'https://x/1' }],
      platform: 'greenhouse',
      strategy: 'ats-api',
      fingerprint: { contentHash: 'abc', jobCount: 1 },
    });

    const summary = await runDiscoveryCycle(d, 'full');

    expect(summary).toMatchObject({ inserted: 1, skipped: 0, failed: 0 });
    expect(d.saved[0]).toMatchObject({ contentHash: 'abc', synced: true, error: null });
  });

  // The two halves of the fix: an empty board is not a failure, an unreachable
  // one is — the back-off counts only the second.
  it('clears the error when a board is read and lists nothing', async () => {
    const d = deps({ jobs: [], platform: 'greenhouse' });

    const summary = await runDiscoveryCycle(d, 'full');

    expect(summary).toMatchObject({ inserted: 0, failed: 0 });
    expect(d.saved[0]).toMatchObject({ error: null });
  });

  it('records a failure when the board could not be read', async () => {
    const d = deps({
      jobs: [],
      platform: 'greenhouse',
      error: 'Board request failed: socket hang up',
    });

    const summary = await runDiscoveryCycle(d, 'full');

    expect(summary).toMatchObject({ failed: 1 });
    expect(d.saved[0]).toMatchObject({
      error: 'Board request failed: socket hang up',
    });
  });

  it('skips a source that is still backing off and writes nothing', async () => {
    const d = deps({ jobs: [] }, [
      source({
        failureCount: 6,
        lastCheckedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
    ]);

    const summary = await runDiscoveryCycle(d, 'full');

    expect(summary).toMatchObject({ skipped: 1, failed: 0 });
    expect(d.saved).toEqual([]);
  });

  it('answers with nothing when the source list cannot be read', async () => {
    const d = deps({ jobs: [] });
    d.sources.list = () => Promise.reject(new Error('API down'));

    expect(await runDiscoveryCycle(d, 'full')).toBeNull();
  });
});
