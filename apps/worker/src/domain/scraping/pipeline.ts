import { HttpClient } from './http';
import { BrowserPool } from './browser';
import { normalizeJobs } from './normalize';
import { extractEmbeddedStateJobs } from './generic/json-walk';
import {
  extractDomJobs,
  extractDomJobsPaged,
  findNextPageUrl,
} from './generic/dom';
import {
  detectAdapterInHtml,
  matchAdapterByUrl,
  type AdapterMatch,
} from './registry';
import { fingerprintJobs, normalizeUrl } from './url';
import type {
  AdapterContext,
  DiscoverOptions,
  HttpFetcher,
  ScrapeResult,
  ScrapeStrategy,
  ScrapedJob,
} from './types';

export interface JobDiscoveryOptions {
  http: HttpClient;
  browser: BrowserPool;
  log?: (data: Record<string, unknown>, msg: string) => void;
  /**
   * Apply the robots.txt gate to the vendor board APIs too.
   *
   * Off by default: SmartRecruiters (and others) serve `Disallow: /` on their
   * API host while their own embed widget calls that exact endpoint from the
   * visitor's browser, so enforcing it there disables the adapter tier without
   * protecting anything. Generic crawling of company sites always honours
   * robots.txt.
   */
  respectRobotsForAts?: boolean;
  /**
   * Wall-clock budget for one source. A JS-heavy careers site can keep the
   * browser busy for minutes; past the budget the expensive rungs are skipped
   * so one bad source cannot stall the cycle.
   */
  maxDurationMs?: number;
  /** Pages of a paginated listing to follow. */
  maxListingPages?: number;
}

const MIN_LISTING_JOBS = 2;
const MIN_DOM_JOBS = 3;

/**
 * Finds the open positions behind a careers URL.
 *
 * The pipeline walks a ladder from cheapest and most exact to most expensive:
 *
 *   1. a known ATS JSON API, matched from the URL (exact ids, no guesswork)
 *   2. the same, matched from the embed markup on a company's own page
 *   3. the state blob a server-rendered SPA leaves in its HTML
 *   4. repeated-structure extraction over the DOM, following pagination
 *
 * Each rung stops the walk as soon as it produces a credible listing, so the
 * common case costs one HTTP request and no browser at all.
 *
 * Rungs are added here only once they are shown to work against a live site;
 * JSON-LD, RSS/JSON feeds, sitemap crawling and XHR capture were all tried and
 * removed because they produced nothing the rungs above did not already cover.
 */
export class JobDiscoveryService {
  private readonly http: HttpClient;
  private readonly browser: BrowserPool;
  private readonly log: (data: Record<string, unknown>, msg: string) => void;
  /** Fetcher handed to ATS adapters — see `respectRobotsForAts`. */
  private readonly atsHttp: HttpFetcher;
  private readonly maxDurationMs: number;
  private readonly maxListingPages: number;

  constructor(options: JobDiscoveryOptions) {
    this.http = options.http;
    this.browser = options.browser;
    this.log = options.log ?? (() => {});
    this.maxDurationMs = options.maxDurationMs ?? 150_000;
    this.maxListingPages = options.maxListingPages ?? 10;
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
      return await this.run(
        sourceUrl,
        options,
        Date.now() + this.maxDurationMs,
      );
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
    deadline: number,
  ): Promise<ScrapeResult> {
    /**
     * Browser-backed rungs run only on a full pass, and only while the source
     * still has budget left.
     */
    const hasBudgetForDeepScan = (): boolean =>
      !options.fastOnly && Date.now() < deadline;

    // 1. The URL itself names the ATS.
    const urlMatch = matchAdapterByUrl(sourceUrl);
    if (urlMatch) {
      const jobs = await this.fetchViaAdapter(urlMatch, options);
      if (jobs.length) {
        return this.finalize(jobs, {
          sourceUrl,
          strategy: 'ats-api',
          platform: urlMatch.adapter.platform,
          previous: options.previous,
        });
      }
    }

    // 2. Fetch the page once; every remaining strategy reads from it.
    const page = await this.http.request(sourceUrl, {
      conditional: options.previous,
    });

    if (page.notModified) {
      this.log({ url: sourceUrl }, 'Source unchanged (304)');
      return {
        jobs: [],
        notModified: true,
        resolvedUrl: sourceUrl,
        platform: options.knownPlatform ?? undefined,
        strategy: options.knownStrategy ?? undefined,
        fingerprint: {
          etag: page.etag ?? options.previous?.etag ?? null,
          lastModified:
            page.lastModified ?? options.previous?.lastModified ?? null,
          contentHash: options.previous?.contentHash ?? null,
          jobCount: options.previous?.jobCount ?? null,
        },
      };
    }

    if (!page.ok || !page.body) {
      return {
        jobs: [],
        resolvedUrl: page.url,
        error: `Fetch failed with status ${page.status}`,
      };
    }

    const html = page.body;
    const pageUrl = page.url || sourceUrl;
    const headerFingerprint = {
      etag: page.etag,
      lastModified: page.lastModified,
    };

    // 3. The page embeds a board from a vendor we have an adapter for.
    const htmlMatch = detectAdapterInHtml(html, pageUrl);
    if (htmlMatch) {
      const jobs = await this.fetchViaAdapter(htmlMatch, options);
      if (jobs.length) {
        this.log(
          { url: pageUrl, platform: htmlMatch.adapter.platform },
          'Resolved ATS from page markup',
        );
        return this.finalize(jobs, {
          sourceUrl: pageUrl,
          strategy: 'ats-api',
          platform: htmlMatch.adapter.platform,
          previous: options.previous,
        });
      }
    }

    // 4. The listing is in a state blob the server left in the HTML.
    const embedded = extractEmbeddedStateJobs(html, pageUrl);
    if (embedded.length >= MIN_LISTING_JOBS) {
      return this.finalize(embedded, {
        sourceUrl: pageUrl,
        strategy: 'embedded-state',
        previous: options.previous,
        headerFingerprint,
      });
    }

    // 5. Read the listing off the DOM. Parsing the HTML we already have is
    //    cheaper than a navigation, so try that before rendering for real.
    if (hasBudgetForDeepScan()) {
      const staticDom = await this.browser
        .withParsedHtml(html, pageUrl, async (p) => ({
          jobs: await extractDomJobs(p),
          nextPage: await findNextPageUrl(p),
        }))
        .catch((err: unknown) => {
          this.log({ url: pageUrl, err }, 'Static DOM extraction failed');
          return { jobs: [] as ScrapedJob[], nextPage: null };
        });

      if (staticDom.jobs.length >= MIN_DOM_JOBS) {
        // The first page is only part of the listing when it paginates, and
        // boards sorted alphabetically hide new postings on later pages — so
        // pay for a real navigation and walk them.
        if (staticDom.nextPage) {
          const paged = await this.pagedDom(pageUrl, deadline);
          if (paged.length > staticDom.jobs.length) {
            return this.finalize(paged, {
              sourceUrl: pageUrl,
              strategy: 'dom-repeat',
              previous: options.previous,
              usedBrowser: true,
            });
          }
        }

        return this.finalize(staticDom.jobs, {
          sourceUrl: pageUrl,
          strategy: 'dom-repeat',
          previous: options.previous,
          headerFingerprint,
          // Parsing static HTML still goes through Chromium, so this source
          // cannot produce anything on a cheap pass — recording that lets the
          // frequent poll skip it instead of re-fetching it for nothing.
          usedBrowser: true,
        });
      }

      // 6. Nothing in the static HTML: the board renders client-side.
      const rendered = await this.pagedDom(pageUrl, deadline);
      if (rendered.length >= MIN_DOM_JOBS) {
        return this.finalize(rendered, {
          sourceUrl: pageUrl,
          strategy: 'dom-repeat',
          previous: options.previous,
          usedBrowser: true,
        });
      }
    }

    return {
      jobs: [],
      resolvedUrl: pageUrl,
      fingerprint: {
        ...headerFingerprint,
        contentHash: null,
        jobCount: 0,
      },
      error: options.fastOnly ? undefined : 'No job listings found',
    };
  }

  /** Renders the board and walks its pagination. */
  private async pagedDom(
    pageUrl: string,
    deadline: number,
  ): Promise<ScrapedJob[]> {
    return this.browser
      .withRenderedPage(pageUrl, (p) =>
        extractDomJobsPaged(p, {
          maxPages: this.maxListingPages,
          deadline,
          log: this.log,
        }),
      )
      .catch((err: unknown) => {
        this.log({ url: pageUrl, err }, 'Paged DOM extraction failed');
        return [] as ScrapedJob[];
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
  ): Promise<ScrapedJob[]> {
    const base = { http: this.atsHttp, log: this.log };
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
      strategy: ScrapeStrategy;
      platform?: string;
      previous?: DiscoverOptions['previous'];
      headerFingerprint?: { etag: string | null; lastModified: string | null };
      usedBrowser?: boolean;
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
        strategy: context.strategy,
        platform: context.platform,
        jobs: jobs.length,
        unchanged,
      },
      'Discovery finished',
    );

    return {
      jobs,
      strategy: context.strategy,
      platform: context.platform,
      resolvedUrl: normalizeUrl(context.sourceUrl),
      notModified: unchanged,
      usedBrowser: context.usedBrowser,
      fingerprint: {
        etag: context.headerFingerprint?.etag ?? null,
        lastModified: context.headerFingerprint?.lastModified ?? null,
        contentHash,
        jobCount: jobs.length,
      },
    };
  }
}
