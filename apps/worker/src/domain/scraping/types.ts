/**
 * Shared contracts for the job discovery pipeline.
 *
 * The pipeline is a ladder: cheap and exact strategies first (known ATS JSON
 * APIs), then structured markup, then a rendered DOM. Every strategy produces
 * the same `ScrapedJob` shape so downstream code never cares how a job was
 * found.
 */

export interface ScrapedJob {
  /** Stable id from the source platform when it exposes one. */
  externalId?: string;
  title: string;
  url: string;
  description?: string;
  location?: string;
  department?: string;
  employmentType?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  /** ISO 8601 */
  postedAt?: string;
}

export type ScrapeStrategy = 'ats-api' | 'embedded-state' | 'dom-repeat';

/** Everything needed to decide "did this source change?" without re-parsing. */
export interface SourceFingerprint {
  etag?: string | null;
  lastModified?: string | null;
  /** sha1 over the sorted job keys — changes only when the job set changes */
  contentHash?: string | null;
  jobCount?: number | null;
}

export interface ScrapeResult {
  jobs: ScrapedJob[];
  /** Which rung of the ladder produced the jobs. */
  strategy?: ScrapeStrategy;
  /** Platform slug when an ATS adapter handled the source. */
  platform?: string;
  /** URL actually scraped (may differ from the input after redirects/probing). */
  resolvedUrl?: string;
  fingerprint?: SourceFingerprint;
  /** True when a conditional GET or an identical content hash proved no change. */
  notModified?: boolean;
  /** True when a headless browser was needed — the source stays "slow". */
  usedBrowser?: boolean;
  error?: string;
}

export interface DiscoverOptions {
  /** Fingerprint stored from the previous run, enables conditional GET. */
  previous?: SourceFingerprint | null;
  /** Skip browser-backed strategies. Used by the frequent low-cost poll. */
  fastOnly?: boolean;
  /** Hints from previous runs so we can jump straight to what worked. */
  knownPlatform?: string | null;
  knownStrategy?: ScrapeStrategy | null;
}

export interface AtsTarget {
  platform: string;
  /** Adapter-specific coordinates, e.g. { token: 'acme' }. */
  params: Record<string, string>;
}

export interface AdapterContext {
  http: HttpFetcher;
  log: (data: Record<string, unknown>, msg: string) => void;
  /**
   * Fetch the listing without the heavy fields (descriptions, compensation).
   * The frequent poll only needs the job set to compare against last time; the
   * full fields are fetched once a change is detected.
   */
  light?: boolean;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  url: string;
  body: string;
  etag: string | null;
  lastModified: string | null;
  contentType: string | null;
  notModified: boolean;
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  /** Sends If-None-Match / If-Modified-Since. */
  conditional?: SourceFingerprint | null;
  timeoutMs?: number;
  /** Skip the robots.txt check (used when fetching robots.txt itself). */
  skipRobots?: boolean;
}

export interface HttpFetcher {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
  json<T>(url: string, options?: HttpRequestOptions): Promise<T | null>;
}

export interface AtsAdapter {
  platform: string;
  /**
   * Recognise a URL that already points at this ATS (either the public board
   * or an embed URL discovered on a company page).
   */
  match(url: URL): AtsTarget | null;
  /**
   * Recognise this ATS from the HTML of an arbitrary careers page — most
   * companies embed their board via an iframe or a script tag.
   */
  detectInHtml?(html: string, pageUrl: URL): AtsTarget | null;
  fetch(target: AtsTarget, ctx: AdapterContext): Promise<ScrapedJob[]>;
}
