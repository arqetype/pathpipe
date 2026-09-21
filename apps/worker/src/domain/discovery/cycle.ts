import { planSource, type CycleMode, type SchedulePolicy } from './schedule';
import type { DiscoverOptions, DiscoveryResult } from './types';

/**
 * One pass over every known job source.
 *
 * The rules live here — what to ask a source for, what its answer means, what
 * to write back. Everything that talks to the outside world arrives as a
 * function on `DiscoveryCycleDeps`, so the entry point is left with wiring and
 * this file is left with decisions.
 */

export interface SourceCompany {
  companyId: string;
  companyName: string;
}

/** A job source as the API hands it over. */
export interface JobSource {
  url: string;
  platform: string | null;
  strategy: string | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string | null;
  jobCount: number;
  requiresBrowser: boolean;
  failureCount: number;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastSyncedAt: string | null;
  companies: SourceCompany[];
}

export interface SourceStore {
  list(): Promise<JobSource[]>;
  /** Persist what this run learned about a source. */
  saveState(url: string, patch: Record<string, unknown>): Promise<void>;
  /** Tell the API new offers landed; who to notify is its question, not ours. */
  notifyNewOffers(): Promise<void>;
  /** Close offers that dated themselves out. Returns how many. */
  expireDatedOffers(): Promise<number>;
}

export interface CycleLog {
  info(data: Record<string, unknown>, msg: string): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(data: Record<string, unknown>, msg: string): void;
}

export interface DiscoveryCycleDeps {
  sources: SourceStore;
  discover(url: string, options: DiscoverOptions): Promise<DiscoveryResult>;
  /** Per-cycle budgets and rate-limit strikes held by the HTTP client. */
  http: { beginCycle(): void; pausedHosts(): string[] };
  /** Writes one board's listing for one company; returns the new offers. */
  ingest(
    company: SourceCompany,
    result: DiscoveryResult,
    listingUrl: string,
  ): Promise<number>;
  /** Caps how many sources are read at once. */
  limit<T>(task: () => Promise<T>): Promise<T>;
  policy: SchedulePolicy;
  log: CycleLog;
  now?: () => number;
}

export interface CycleSummary {
  mode: CycleMode;
  sources: number;
  skipped: number;
  inserted: number;
  failed: number;
  backedOffHosts: string[];
  seconds: number;
}

const processSource = async (
  deps: DiscoveryCycleDeps,
  source: JobSource,
  mode: CycleMode,
): Promise<{ inserted: number; skipped: boolean; failed: boolean }> => {
  const idle = { inserted: 0, skipped: false, failed: false };
  const decision = planSource(
    source,
    mode,
    (deps.now ?? Date.now)(),
    deps.policy,
  );
  if (decision.skip) return { ...idle, skipped: true };

  const result = await deps.discover(source.url, {
    previous: decision.reconcile
      ? null
      : {
          etag: source.etag,
          lastModified: source.lastModified,
          contentHash: source.contentHash,
          jobCount: source.jobCount,
        },
    fastOnly: decision.fastOnly,
  });

  if (result.notModified) {
    await deps.sources.saveState(source.url, {
      platform: result.platform ?? source.platform,
      etag: result.fingerprint?.etag ?? source.etag,
      lastModified: result.fingerprint?.lastModified ?? source.lastModified,
    });
    return idle;
  }

  if (!result.jobs.length) {
    // An error means the board could not be read; no error means it was read
    // and has nothing open. Only the first backs a source off — a company with
    // no vacancies is not a broken source.
    const failed = Boolean(result.error);
    await deps.sources.saveState(source.url, {
      error: result.error ?? null,
      platform: result.platform ?? source.platform,
      etag: result.fingerprint?.etag ?? null,
      lastModified: result.fingerprint?.lastModified ?? null,
    });
    if (failed) {
      deps.log.warn(
        { url: source.url, error: result.error },
        'Could not read source',
      );
    }
    return { ...idle, failed };
  }

  const listingUrl = result.resolvedUrl ?? source.url;
  let inserted = 0;
  for (const company of source.companies) {
    inserted += await deps.ingest(company, result, listingUrl);
  }

  await deps.sources.saveState(source.url, {
    platform: result.platform ?? null,
    strategy: result.strategy ?? null,
    etag: result.fingerprint?.etag ?? null,
    lastModified: result.fingerprint?.lastModified ?? null,
    contentHash: result.fingerprint?.contentHash ?? null,
    jobCount: result.fingerprint?.jobCount ?? result.jobs.length,
    changed: source.contentHash !== result.fingerprint?.contentHash,
    synced: true,
    error: null,
  });

  return { inserted, skipped: false, failed: false };
};

/** Reads every source that is due, writes what it found, and reports. */
export const runDiscoveryCycle = async (
  deps: DiscoveryCycleDeps,
  mode: CycleMode,
): Promise<CycleSummary | null> => {
  const startedAt = (deps.now ?? Date.now)();
  // Per-host budgets and rate-limit strikes are per cycle: a host that told us
  // to back off gets its next chance hours from now, not seconds.
  deps.http.beginCycle();

  let sources: JobSource[];
  try {
    sources = await deps.sources.list();
  } catch (err) {
    deps.log.error({ err }, 'Failed to fetch job sources');
    return null;
  }

  deps.log.info({ mode, sources: sources.length }, 'Starting discovery cycle');

  const results = await Promise.all(
    sources.map((source) =>
      deps.limit(async () => {
        try {
          return await processSource(deps, source, mode);
        } catch (err) {
          deps.log.error({ url: source.url, err }, 'Source failed');
          await deps.sources.saveState(source.url, {
            error: err instanceof Error ? err.message : String(err),
          });
          return { inserted: 0, skipped: false, failed: true };
        }
      }),
    ),
  );

  const inserted = results.reduce((sum, r) => sum + r.inserted, 0);

  const closed = await deps.sources.expireDatedOffers();
  if (closed) deps.log.info({ closed }, 'Closed offers past their end date');

  if (inserted) await deps.sources.notifyNewOffers();

  return {
    mode,
    sources: sources.length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.failed).length,
    inserted,
    // Silence about a host we stopped talking to would read as "that board has
    // no jobs" rather than "we were asked to stop".
    backedOffHosts: deps.http.pausedHosts(),
    seconds: Math.round(((deps.now ?? Date.now)() - startedAt) / 1000),
  };
};
