import { normalizeJobs } from './normalize/job';
import { matchAdapterByUrl, type AdapterMatch } from './registry';
import { fingerprintJobs, normalizeUrl } from './url';
import type {
  AdapterContext,
  DiscoverOptions,
  HttpFetcher,
  DiscoveryResult,
  DiscoveredJob,
} from './types';

export interface JobDiscoveryOptions {
  http: HttpFetcher;
  log?: (data: Record<string, unknown>, msg: string) => void;
  // ATS API robots.txt blocks everything.
  respectRobotsForAts?: boolean;
}

export class JobDiscoveryService {
  private readonly log: (data: Record<string, unknown>, msg: string) => void;
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
  ): Promise<DiscoveryResult> {
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
  ): Promise<DiscoveryResult> {
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
    const failures: string[] = [];
    const jobs = await this.fetchViaAdapter(
      match,
      options,
      (reason) => {
        partialReason = reason;
      },
      (reason) => failures.push(reason),
    );
    if (!jobs.length) {
      return {
        jobs: [],
        resolvedUrl: normalizeUrl(sourceUrl),
        platform: match.adapter.platform,
        error: failures.length
          ? `Board request failed: ${failures.join('; ')}`
          : undefined,
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

  private async fetchViaAdapter(
    match: AdapterMatch,
    options: DiscoverOptions,
    onPartial: (reason: string) => void,
    onFailure: (reason: string) => void,
  ): Promise<DiscoveredJob[]> {
    const base = {
      http: this.atsHttp,
      log: this.log,
      markPartial: onPartial,
    };
    const call = (light: boolean): Promise<DiscoveredJob[]> =>
      match.adapter
        .fetch(match.target, { ...base, light } as AdapterContext)
        .catch((err: unknown) => {
          this.log(
            { platform: match.adapter.platform, light, err },
            'ATS adapter failed',
          );
          onFailure(err instanceof Error ? err.message : String(err));
          return [] as DiscoveredJob[];
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

  private finalize(
    raw: DiscoveredJob[],
    context: {
      sourceUrl: string;
      platform: string;
      previous?: DiscoverOptions['previous'];
      partial: boolean;
    },
  ): DiscoveryResult {
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
