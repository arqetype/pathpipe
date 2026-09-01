import { HttpClient } from './http';
import { normalizeJobs } from './normalize';
import { matchAdapterByUrl, type AdapterMatch } from './registry';
import { fingerprintJobs, normalizeUrl } from './url';
import type {
  AdapterContext,
  DiscoverOptions,
  HttpFetcher,
  ScrapeResult,
  ScrapedJob,
} from './types';

export interface JobDiscoveryOptions {
  http: HttpClient;
  log?: (data: Record<string, unknown>, msg: string) => void;
  /**
   * Apply the robots.txt gate to the vendor board APIs.
   *
   * Off by default: SmartRecruiters (and others) serve `Disallow: /` on their
   * API host while their own embed widget calls that exact endpoint from the
   * visitor's browser, so enforcing it there disables the adapter without
   * protecting anything.
   */
  respectRobotsForAts?: boolean;
}

/**
 * Reads the open positions behind a careers URL — from the vendor's own API,
 * and from nothing else.
 *
 * There is one rung: the URL names an ATS, and that ATS publishes a JSON API.
 * No page fetching, no DOM extraction, no headless browser. That is a
 * deliberate limit rather than a missing feature — the crawling tiers existed,
 * worked, and were removed, because a board we cannot read through an API is
 * not worth the rate limits and IP bans that reading it by hand invites.
 *
 * Which ATS a company uses is settled ahead of time by `vendors.ts`, which asks
 * each vendor's public API directly rather than reading anybody's HTML. So a
 * company arrives here already pointed at a board this can read.
 *
 * Adding coverage means adding an adapter for a vendor with a public API, never
 * a cleverer way to parse a page.
 */
export class JobDiscoveryService {
  private readonly log: (data: Record<string, unknown>, msg: string) => void;
  /** Fetcher handed to ATS adapters — see `respectRobotsForAts`. */
  private readonly atsHttp: HttpFetcher;

  constructor(options: JobDiscoveryOptions) {
    this.log = options.log ?? (() => {});
    this.atsHttp = options.respectRobotsForAts
      ? options.http
      : {
          request: (url, requestOptions) =>
            options.http.request(url, { ...requestOptions, skipRobots: true }),
          json: (url, requestOptions) =>
            options.http.json(url, { ...requestOptions, skipRobots: true }),
        };
  }

  async discover(
    sourceUrl: string,
    options: DiscoverOptions = {},
  ): Promise<ScrapeResult> {
    try {
      return await this.run(sourceUrl, options);
    } catch (err) {
      return {
        jobs: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async run(
    sourceUrl: string,
    options: DiscoverOptions,
  ): Promise<ScrapeResult> {
    const match = matchAdapterByUrl(sourceUrl);
    if (!match) {
      return {
        jobs: [],
        resolvedUrl: sourceUrl,
        error:
          'No ATS adapter claims this URL. Boards are resolved by seeding, which asks each vendor API directly — run the board discovery for this company.',
      };
    }

    let partialReason: string | null = null;
    const jobs = await this.fetchViaAdapter(match, options, (reason) => {
      partialReason = reason;
    });
    if (!jobs.length) {
      return {
        jobs: [],
        resolvedUrl: normalizeUrl(sourceUrl),
        platform: match.adapter.platform,
        error: 'Board answered with no open positions',
      };
    }

    if (partialReason) {
      this.log(
        { url: sourceUrl, reason: partialReason },
        'Listing incomplete — reconciliation will be skipped for this source',
      );
    }

    return this.finalize(jobs, {
      sourceUrl,
      platform: match.adapter.platform,
      previous: options.previous,
      partial: Boolean(partialReason),
    });
  }

  /**
   * Calls an ATS adapter, cheaply first.
   *
   * On a frequent poll we only need the job set to compare against the previous
   * run, so the adapter is asked to skip descriptions — the difference is often
   * megabytes. The full payload is fetched only once the cheap answer proves
   * something changed.
   */
  private async fetchViaAdapter(
    match: AdapterMatch,
    options: DiscoverOptions,
    onPartial: (reason: string) => void,
  ): Promise<ScrapedJob[]> {
    const base = {
      http: this.atsHttp,
      log: this.log,
      markPartial: onPartial,
    };
    const call = (light: boolean): Promise<ScrapedJob[]> =>
      match.adapter
        .fetch(match.target, { ...base, light } as AdapterContext)
        .catch((err: unknown) => {
          this.log(
            { platform: match.adapter.platform, light, err },
            'ATS adapter failed',
          );
          return [] as ScrapedJob[];
        });

    if (!options.fastOnly) return call(false);

    const light = await call(true);
    if (!light.length) return light;

    const hash = fingerprintJobs(
      normalizeJobs(light, match.adapter.platform),
      match.adapter.platform,
    );
    if (options.previous?.contentHash === hash) return light;

    const full = await call(false);
    return full.length ? full : light;
  }

  /** Normalises, dedupes and fingerprints a raw listing. */
  private finalize(
    raw: ScrapedJob[],
    context: {
      sourceUrl: string;
      platform: string;
      previous?: DiscoverOptions['previous'];
      /** True when the adapter did not reach the end of the board. */
      partial: boolean;
    },
  ): ScrapeResult {
    const jobs = normalizeJobs(raw, context.platform);
    const contentHash = fingerprintJobs(jobs, context.platform);
    const unchanged = Boolean(
      context.previous?.contentHash &&
      context.previous.contentHash === contentHash,
    );

    this.log(
      {
        url: context.sourceUrl,
        platform: context.platform,
        jobs: jobs.length,
        unchanged,
      },
      'Discovery finished',
    );

    return {
      jobs,
      strategy: 'ats-api',
      platform: context.platform,
      resolvedUrl: normalizeUrl(context.sourceUrl),
      notModified: unchanged,
      // Set only by an adapter that said it stopped early. Reconciliation reads
      // a complete listing as "everything else is gone", so this must never be
      // optimistic.
      partial: context.partial,
      fingerprint: {
        etag: null,
        lastModified: null,
        contentHash,
        jobCount: jobs.length,
      },
    };
  }
}
