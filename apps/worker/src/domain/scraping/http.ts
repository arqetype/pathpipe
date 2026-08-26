import { hostOf } from './url';
import type { HttpFetcher, HttpRequestOptions, HttpResponse } from './types';

export interface HttpClientOptions {
  userAgent: string;
  /** Minimum delay between two requests to the same host, in ms. */
  perHostDelayMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
  respectRobots?: boolean;
  maxBodyBytes?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
}

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
  private readonly maxRetries: number;
  private readonly defaultTimeoutMs: number;
  private readonly respectRobots: boolean;
  private readonly maxBodyBytes: number;
  private readonly log: (data: Record<string, unknown>, msg: string) => void;

  /** Tail of the per-host request chain, used to serialise requests. */
  private readonly hostChain = new Map<string, Promise<unknown>>();
  private readonly lastHit = new Map<string, number>();
  private readonly robotsCache = new Map<string, Promise<RobotsRules | null>>();

  constructor(options: HttpClientOptions) {
    this.userAgent = options.userAgent;
    this.perHostDelayMs = options.perHostDelayMs ?? 800;
    this.maxRetries = options.maxRetries ?? 2;
    this.defaultTimeoutMs = options.timeoutMs ?? 20000;
    this.respectRobots = options.respectRobots ?? true;
    // Large boards legitimately return tens of megabytes: an ATS listing
    // endpoint ships every posting's description in one document.
    this.maxBodyBytes = options.maxBodyBytes ?? 48 * 1024 * 1024;
    this.log = options.log ?? (() => {});
  }

  async request(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse> {
    const host = hostOf(url);
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

    const robots = options.skipRobots ? null : await this.robotsFor(url);
    const delay = Math.max(this.perHostDelayMs, robots?.crawlDelayMs ?? 0);
    const since = Date.now() - (this.lastHit.get(host) ?? 0);
    if (since < delay) await sleep(delay - since);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.lastHit.set(host, Date.now());
      try {
        const response = await this.execute(url, options);
        if (response.status === 429 || response.status >= 500) {
          if (attempt === this.maxRetries) return response;
          const backoff = Math.min(15000, 1000 * 2 ** attempt);
          await sleep(backoff);
          continue;
        }
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
