import { registrableDomain } from './url';
import type { HttpFetcher, HttpRequestOptions, HttpResponse } from './types';

export interface HttpClientOptions {
  userAgent: string;
  /**
   * Minimum delay between two requests to the same vendor, in ms.
   *
   * "Vendor" rather than "host": see `registrableDomain`. Every board on
   * Teamtailor gets its own subdomain, and all of them are one server.
   */
  perHostDelayMs?: number;
  /**
   * Per-vendor floors on that delay, keyed by registrable domain.
   *
   * Some vendors answer 429 well before the global default is slow enough for
   * them. Every entry here is one that did so during endpoint verification.
   */
  vendorDelayMs?: Record<string, number>;
  maxRetries?: number;
  timeoutMs?: number;
  respectRobots?: boolean;
  maxBodyBytes?: number;
  /**
   * Requests allowed to one vendor per cycle. Reached, the vendor is left alone
   * until the next cycle.
   *
   * A single vendor can be behind hundreds of boards, so a per-source budget
   * does not bound what any one vendor actually receives from us. This does.
   */
  maxRequestsPerHost?: number;
  /** Consecutive rate-limit answers before a host is dropped for the cycle. */
  maxRateLimitStrikes?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
}

/** What we know about how a vendor is currently treating us. */
interface HostState {
  /** Epoch ms until which the vendor is left alone entirely. */
  pausedUntil: number;
  /** Consecutive 429s; enough of them and the vendor is dropped for the cycle. */
  strikes: number;
  /** Requests sent this cycle. */
  requests: number;
  /** Set once the host is out for the rest of the cycle. */
  droppedForCycle: boolean;
}

/**
 * Status codes and body markers that mean "a bot filter answered", not "the
 * server had a problem".
 *
 * The distinction matters: a 503 from an overloaded origin is worth retrying,
 * a 503 carrying a Cloudflare challenge is a door being held shut, and retrying
 * it is what turns a soft block into a hard one.
 */
const CHALLENGE_MARKERS =
  /(just a moment|attention required|checking your browser|cf-browser-verification|cf_chl_|enable javascript and cookies to continue|__cf_chl|access denied.*cloudflare|error 1015|you have been blocked)/i;

/**
 * Vendors that answer 429 at the default pace, with the pace they tolerate.
 *
 * Measured, not guessed: each of these rate-limited a plain sequential probe
 * while its endpoints were being verified. Being throttled is one shared IP
 * away from being blocked, and the IP we crawl from is somebody's office.
 */
const DEFAULT_VENDOR_DELAY_MS: Record<string, number> = {
  'personio.de': 3000,
  'personio.com': 3000,
  'teamtailor.com': 1500,
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal robots.txt model: the disallow prefixes that apply to us. */
interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelayMs: number | null;
}

/**
 * HTTP client tuned for scraping: one in-flight request per host, a floor on
 * the gap between requests to the same host, retry with backoff on transient
 * failures, conditional GET support and a robots.txt gate.
 */
export class HttpClient implements HttpFetcher {
  private readonly userAgent: string;
  private readonly perHostDelayMs: number;
  private readonly vendorDelayMs: Record<string, number>;
  private readonly maxRetries: number;
  private readonly defaultTimeoutMs: number;
  private readonly respectRobots: boolean;
  private readonly maxBodyBytes: number;
  private readonly log: (data: Record<string, unknown>, msg: string) => void;

  private readonly maxRequestsPerHost: number;
  private readonly maxRateLimitStrikes: number;

  /** Tail of the per-host request chain, used to serialise requests. */
  private readonly hostChain = new Map<string, Promise<unknown>>();
  private readonly lastHit = new Map<string, number>();
  private readonly robotsCache = new Map<string, Promise<RobotsRules | null>>();
  private readonly hostState = new Map<string, HostState>();

  constructor(options: HttpClientOptions) {
    this.userAgent = options.userAgent;
    this.perHostDelayMs = options.perHostDelayMs ?? 800;
    this.vendorDelayMs = {
      ...DEFAULT_VENDOR_DELAY_MS,
      ...(options.vendorDelayMs ?? {}),
    };
    this.maxRetries = options.maxRetries ?? 2;
    this.defaultTimeoutMs = options.timeoutMs ?? 20000;
    this.respectRobots = options.respectRobots ?? true;
    // Large boards legitimately return tens of megabytes: an ATS listing
    // endpoint ships every posting's description in one document.
    this.maxBodyBytes = options.maxBodyBytes ?? 48 * 1024 * 1024;
    this.maxRequestsPerHost = options.maxRequestsPerHost ?? 1500;
    this.maxRateLimitStrikes = options.maxRateLimitStrikes ?? 3;
    this.log = options.log ?? (() => {});
  }

  /**
   * Starts a new cycle: per-vendor budgets and strikes reset.
   *
   * A vendor dropped for being unhappy with us gets another chance next cycle,
   * which is hours away — not the few seconds a retry loop would give it.
   */
  beginCycle(): void {
    for (const [host, state] of this.hostState) {
      this.hostState.set(host, {
        pausedUntil: state.pausedUntil,
        strikes: 0,
        requests: 0,
        droppedForCycle: false,
      });
    }
  }

  /** Vendors currently being left alone, for the cycle log. */
  pausedHosts(): string[] {
    const now = Date.now();
    return [...this.hostState.entries()]
      .filter(([, state]) => state.droppedForCycle || state.pausedUntil > now)
      .map(([host]) => host);
  }

  private stateFor(host: string): HostState {
    const existing = this.hostState.get(host);
    if (existing) return existing;
    const fresh: HostState = {
      pausedUntil: 0,
      strikes: 0,
      requests: 0,
      droppedForCycle: false,
    };
    this.hostState.set(host, fresh);
    return fresh;
  }

  /**
   * `Retry-After`, in ms, when the server said how long to wait.
   *
   * Both forms are legal — a delay in seconds or an HTTP date — and ignoring
   * the header is the surest way to turn a polite rate-limit into a ban.
   */
  private retryAfterMs(header: string | null): number | null {
    if (!header) return null;
    const seconds = Number(header.trim());
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(header);
    if (Number.isNaN(date)) return null;
    return Math.max(0, date - Date.now());
  }

  /** True when the answer came from a bot filter rather than the application. */
  private isChallenge(response: HttpResponse): boolean {
    if (response.status === 403 || response.status === 503) {
      return response.status === 403 || CHALLENGE_MARKERS.test(response.body);
    }
    return false;
  }

  /** Stops sending to a vendor for the rest of this cycle. */
  private dropHost(host: string, reason: string, url: string): void {
    const state = this.stateFor(host);
    state.droppedForCycle = true;
    this.log(
      { host, url, reason },
      'Vendor backed off for the rest of the cycle',
    );
  }

  async request(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse> {
    // Keyed by vendor: one in-flight request per vendor, not per subdomain.
    const host = registrableDomain(url);
    const previous = this.hostChain.get(host) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.throttledRequest(host, url, options));
    // Keep the chain alive regardless of individual failures.
    this.hostChain.set(
      host,
      task.catch(() => undefined),
    );
    return task;
  }

  async json<T>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<T | null> {
    const response = await this.request(url, {
      ...options,
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    });
    if (!response.ok || !response.body) return null;
    try {
      return JSON.parse(response.body) as T;
    } catch {
      return null;
    }
  }

  private async throttledRequest(
    host: string,
    url: string,
    options: HttpRequestOptions,
  ): Promise<HttpResponse> {
    if (!options.skipRobots && this.respectRobots) {
      const allowed = await this.isAllowed(url);
      if (!allowed) {
        this.log({ url }, 'Blocked by robots.txt');
        return this.emptyResponse(url, 999);
      }
    }

    const state = this.stateFor(host);

    // A vendor that has told us to stop is not asked again this cycle. Answering
    // 429 with another request is what escalates a rate-limit into a block.
    if (state.droppedForCycle) return this.emptyResponse(url, 429);
    if (state.pausedUntil > Date.now()) {
      const waitMs = state.pausedUntil - Date.now();
      // A short pause is worth waiting out inline; a long one means the vendor is
      // done with us for now and the cycle should move on.
      if (waitMs > 60_000) return this.emptyResponse(url, 429);
      await sleep(waitMs);
    }
    if (state.requests >= this.maxRequestsPerHost) {
      if (!state.droppedForCycle) {
        this.dropHost(host, 'per-cycle request budget reached', url);
      }
      return this.emptyResponse(url, 429);
    }

    const robots = options.skipRobots ? null : await this.robotsFor(url);
    const delay = Math.max(
      this.perHostDelayMs,
      this.vendorDelayMs[host] ?? 0,
      robots?.crawlDelayMs ?? 0,
    );
    const since = Date.now() - (this.lastHit.get(host) ?? 0);
    if (since < delay) await sleep(delay - since);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.lastHit.set(host, Date.now());
      state.requests += 1;
      try {
        const response = await this.execute(url, options);

        // A bot filter answered. Retrying is exactly the wrong move: the filter
        // is not going to change its mind within seconds, and repeating the
        // request is the behaviour that earns a longer ban.
        if (this.isChallenge(response)) {
          this.dropHost(host, `challenged with ${response.status}`, url);
          return response;
        }

        if (response.status === 429) {
          state.strikes += 1;
          const askedFor = this.retryAfterMs(response.retryAfter);
          if (askedFor !== null) {
            // Honour what the server asked for, up to the point where waiting
            // stops being a pause and starts being a stall.
            state.pausedUntil = Date.now() + Math.min(askedFor, 10 * 60_000);
            this.log(
              { host, url, retryAfterMs: askedFor },
              'Rate limited, honouring Retry-After',
            );
          }
          if (state.strikes >= this.maxRateLimitStrikes) {
            this.dropHost(host, 'repeatedly rate limited', url);
            return response;
          }
          if (attempt === this.maxRetries) return response;
          await sleep(
            askedFor !== null
              ? Math.min(askedFor, 30_000)
              : Math.min(30_000, 2000 * 2 ** attempt),
          );
          continue;
        }

        if (response.status >= 500) {
          if (attempt === this.maxRetries) return response;
          await sleep(Math.min(15000, 1000 * 2 ** attempt));
          continue;
        }

        // A clean answer clears the slate: strikes are about a host that is
        // currently unhappy, not a permanent record.
        if (response.ok) state.strikes = 0;
        return response;
      } catch (err) {
        lastError = err;
        if (attempt === this.maxRetries) break;
        await sleep(Math.min(10000, 750 * 2 ** attempt));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Request failed: ${url}`);
  }

  private async execute(
    url: string,
    options: HttpRequestOptions,
  ): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
      ...(options.headers ?? {}),
    };

    if (options.conditional?.etag) {
      headers['If-None-Match'] = options.conditional.etag;
    }
    if (options.conditional?.lastModified) {
      headers['If-Modified-Since'] = options.conditional.lastModified;
    }

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? this.defaultTimeoutMs),
    });

    if (response.status === 304) {
      return {
        status: 304,
        ok: true,
        url: response.url || url,
        body: '',
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        contentType: response.headers.get('content-type'),
        retryAfter: response.headers.get('retry-after'),
        notModified: true,
      };
    }

    const body = await this.readCapped(response);

    return {
      status: response.status,
      ok: response.ok,
      url: response.url || url,
      body,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentType: response.headers.get('content-type'),
      retryAfter: response.headers.get('retry-after'),
      notModified: false,
    };
  }

  /**
   * Guards against a runaway response wedging the worker.
   *
   * An over-cap body is discarded rather than truncated: half a JSON document
   * parses as nothing anyway, and a silent half-document would look like an
   * empty board instead of a failure worth logging.
   */
  private async readCapped(response: Response): Promise<string> {
    const declared = Number(response.headers.get('content-length') ?? '0');
    if (declared > this.maxBodyBytes) {
      this.log(
        { url: response.url, bytes: declared, cap: this.maxBodyBytes },
        'Response exceeds size cap, discarded',
      );
      return '';
    }
    if (!response.body) return response.text();

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let size = 0;
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > this.maxBodyBytes) {
        await reader.cancel().catch(() => undefined);
        this.log(
          { url: response.url, cap: this.maxBodyBytes },
          'Response exceeds size cap, discarded',
        );
        return '';
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  }

  private emptyResponse(url: string, status: number): HttpResponse {
    return {
      status,
      ok: false,
      url,
      body: '',
      etag: null,
      lastModified: null,
      contentType: null,
      retryAfter: null,
      notModified: false,
    };
  }

  private async isAllowed(url: string): Promise<boolean> {
    const rules = await this.robotsFor(url);
    if (!rules) return true;

    const path = (() => {
      try {
        const parsed = new URL(url);
        return `${parsed.pathname}${parsed.search}`;
      } catch {
        return '/';
      }
    })();

    const matchLength = (patterns: string[]): number => {
      let best = -1;
      for (const pattern of patterns) {
        if (this.robotsPathMatches(pattern, path) && pattern.length > best) {
          best = pattern.length;
        }
      }
      return best;
    };

    const disallowed = matchLength(rules.disallow);
    if (disallowed < 0) return true;
    // Longest match wins, matching the de-facto robots.txt semantics.
    return matchLength(rules.allow) >= disallowed;
  }

  private robotsPathMatches(pattern: string, path: string): boolean {
    if (!pattern) return false;
    if (!pattern.includes('*') && !pattern.endsWith('$')) {
      return path.startsWith(pattern);
    }
    const anchored = pattern.endsWith('$');
    const body = anchored ? pattern.slice(0, -1) : pattern;
    const escaped = body
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(path);
  }

  /**
   * Waits out the vendor's minimum gap, then books this moment as its last hit.
   *
   * Used for the requests that cannot pass through the per-vendor queue, so
   * they still count towards the pace and the cycle budget.
   */
  private async awaitVendorGap(host: string): Promise<void> {
    const delay = Math.max(this.perHostDelayMs, this.vendorDelayMs[host] ?? 0);
    const since = Date.now() - (this.lastHit.get(host) ?? 0);
    if (since < delay) await sleep(delay - since);
    this.lastHit.set(host, Date.now());
    this.stateFor(host).requests += 1;
  }

  private robotsFor(url: string): Promise<RobotsRules | null> {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      return Promise.resolve(null);
    }

    const cached = this.robotsCache.get(origin);
    if (cached) return cached;

    const pending = this.fetchRobots(origin).catch(() => null);
    this.robotsCache.set(origin, pending);
    return pending;
  }

  private async fetchRobots(origin: string): Promise<RobotsRules | null> {
    // robots.txt cannot go through `request`: it is fetched from inside the
    // vendor's own queue slot, so re-entering that queue would wait on itself.
    // It still has to respect the vendor's pace — one robots.txt per board is
    // one extra request per board, and a vendor that hands every customer a
    // subdomain sees all of them.
    await this.awaitVendorGap(registrableDomain(origin));
    const response = await this.execute(`${origin}/robots.txt`, {
      skipRobots: true,
      timeoutMs: 8000,
    }).catch(() => null);
    if (!response || !response.ok || !response.body) return null;
    return this.parseRobots(response.body);
  }

  private parseRobots(text: string): RobotsRules {
    const rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null };
    // Only the wildcard group applies to us; a named group for our UA overrides it.
    let inScope = false;
    let sawNamedGroup = false;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.split('#')[0]?.trim() ?? '';
      if (!line) continue;
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      const field = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();

      if (field === 'user-agent') {
        const agent = value.toLowerCase();
        const isOurs = agent.includes('pathpipe');
        if (isOurs && !sawNamedGroup) {
          // A rule set aimed at us replaces anything collected from '*'.
          sawNamedGroup = true;
          rules.disallow.length = 0;
          rules.allow.length = 0;
        }
        inScope = isOurs || (agent === '*' && !sawNamedGroup);
        continue;
      }

      if (!inScope) continue;
      if (field === 'disallow' && value) rules.disallow.push(value);
      if (field === 'allow' && value) rules.allow.push(value);
      if (field === 'crawl-delay') {
        const seconds = Number.parseFloat(value);
        if (Number.isFinite(seconds)) {
          rules.crawlDelayMs = Math.min(10000, seconds * 1000);
        }
      }
    }

    return rules;
  }

  /** Sitemap URLs declared in robots.txt — a cheap job-listing index. */
  async sitemapsFor(url: string): Promise<string[]> {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      return [];
    }
    const response = await this.request(`${origin}/robots.txt`, {
      skipRobots: true,
      timeoutMs: 8000,
    }).catch(() => null);
    if (!response?.ok || !response.body) return [];
    return response.body
      .split(/\r?\n/)
      .map((line) => line.split('#')[0]?.trim() ?? '')
      .filter((line) => /^sitemap\s*:/i.test(line))
      .map((line) => line.slice(line.indexOf(':') + 1).trim())
      .filter(Boolean);
  }
}
