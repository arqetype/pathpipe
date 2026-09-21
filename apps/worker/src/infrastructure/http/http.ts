import { registrableDomain } from '@/domain/discovery/url';
import type {
  HttpFetcher,
  HttpRequestOptions,
  HttpResponse,
} from '@/domain/discovery/types';
import {
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES,
  VENDOR_DELAY_MS,
  isChallenge,
  retryAfterMs,
  sleep,
  type HostState,
} from './limits';
import { readCapped } from './body';
import { parseRobots, robotsAllows, type RobotsRules } from './robots';

export { VENDOR_DELAY_MS };

export interface HttpClientOptions {
  userAgent: string;
  perHostDelayMs?: number;
  respectRobots?: boolean;
  maxRequestsPerHost?: number;
  maxRateLimitStrikes?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
}

export class HttpClient implements HttpFetcher {
  private readonly userAgent: string;
  private readonly perHostDelayMs: number;
  private readonly respectRobots: boolean;
  private readonly log: (data: Record<string, unknown>, msg: string) => void;

  private readonly maxRequestsPerHost: number;
  private readonly maxRateLimitStrikes: number;

  private readonly hostChain = new Map<string, Promise<unknown>>();
  private readonly lastHit = new Map<string, number>();
  private readonly robotsCache = new Map<string, Promise<RobotsRules | null>>();
  private readonly hostState = new Map<string, HostState>();

  constructor(options: HttpClientOptions) {
    this.userAgent = options.userAgent;
    this.perHostDelayMs = options.perHostDelayMs ?? 800;
    this.respectRobots = options.respectRobots ?? true;
    this.maxRequestsPerHost = options.maxRequestsPerHost ?? 1500;
    this.maxRateLimitStrikes = options.maxRateLimitStrikes ?? 3;
    this.log = options.log ?? (() => {});
  }

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
    // Keyed by vendor, not by subdomain.
    const host = registrableDomain(url);
    const previous = this.hostChain.get(host) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.throttledRequest(host, url, options));
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

    if (state.droppedForCycle) return this.emptyResponse(url, 429);
    if (state.pausedUntil > Date.now()) {
      const waitMs = state.pausedUntil - Date.now();
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
      VENDOR_DELAY_MS[host] ?? 0,
      robots?.crawlDelayMs ?? 0,
    );
    const since = Date.now() - (this.lastHit.get(host) ?? 0);
    if (since < delay) await sleep(delay - since);

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      this.lastHit.set(host, Date.now());
      state.requests += 1;
      try {
        const response = await this.execute(url, options);

        // Never retry a challenge: it bans.
        if (isChallenge(response)) {
          this.dropHost(host, `challenged with ${response.status}`, url);
          return response;
        }

        if (response.status === 429) {
          state.strikes += 1;
          const askedFor = retryAfterMs(response.retryAfter);
          if (askedFor !== null) {
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
          if (attempt === MAX_RETRIES) return response;
          await sleep(
            askedFor !== null
              ? Math.min(askedFor, 30_000)
              : Math.min(30_000, 2000 * 2 ** attempt),
          );
          continue;
        }

        if (response.status >= 500) {
          if (attempt === MAX_RETRIES) return response;
          await sleep(Math.min(15000, 1000 * 2 ** attempt));
          continue;
        }

        if (response.ok) state.strikes = 0;
        return response;
      } catch (err) {
        lastError = err;
        if (attempt === MAX_RETRIES) break;
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

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });

    const body = await readCapped(response, this.log);

    return {
      status: response.status,
      ok: response.ok,
      url: response.url || url,
      body,
      retryAfter: response.headers.get('retry-after'),
    };
  }

  private emptyResponse(url: string, status: number): HttpResponse {
    return {
      status,
      ok: false,
      url,
      body: '',
      retryAfter: null,
    };
  }

  private async isAllowed(url: string): Promise<boolean> {
    const rules = await this.robotsFor(url);
    if (!rules) return true;
    return robotsAllows(rules, url);
  }

  private async awaitVendorGap(host: string): Promise<void> {
    const delay = Math.max(this.perHostDelayMs, VENDOR_DELAY_MS[host] ?? 0);
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
    // Outside `request`: that queue would self-wait.
    await this.awaitVendorGap(registrableDomain(origin));
    const response = await this.execute(`${origin}/robots.txt`, {
      skipRobots: true,
      timeoutMs: 8000,
    }).catch(() => null);
    if (!response || !response.ok || !response.body) return null;
    return parseRobots(response.body);
  }
}
