import { HttpClient, VENDOR_DELAY_MS } from './http';
import type { HttpRequestOptions } from '@/domain/discovery/types';

/**
 * Every test here drives a fake `fetch`. The client's own pacing is real, so
 * the delays are set to a few milliseconds rather than the production 800.
 *
 * A `Response` body can only be read once, so each answer is built fresh per
 * call rather than handed out as one shared object.
 */
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const answer = (
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response =>
  new Response(body, { status: init.status ?? 200, headers: init.headers });

const always = (body: string, init?: Parameters<typeof answer>[1]): void => {
  fetchMock.mockImplementation(() => Promise.resolve(answer(body, init)));
};

const once = (body: string, init?: Parameters<typeof answer>[1]): void => {
  fetchMock.mockImplementationOnce(() => Promise.resolve(answer(body, init)));
};

const client = (
  over: Partial<ConstructorParameters<typeof HttpClient>[0]> = {},
) =>
  new HttpClient({
    userAgent: 'PathpipeBot/1.0 (test)',
    perHostDelayMs: 0,
    respectRobots: false,
    ...over,
  });

/** The robots.txt gate has its own describe; everything else opts out of it. */
const get = (http: HttpClient, url: string, options: HttpRequestOptions = {}) =>
  http.request(url, { skipRobots: true, ...options });

const urlsFetched = (): string[] =>
  fetchMock.mock.calls.map(([url]) => url as string);

describe('request', () => {
  it('sends the configured user agent and returns the body', async () => {
    always('hello');

    const response = await get(client(), 'https://example.com/a');

    expect(response).toEqual({
      status: 200,
      ok: true,
      url: 'https://example.com/a',
      body: 'hello',
      retryAfter: null,
    });
    expect(fetchMock.mock.calls[0]?.[1].headers['User-Agent']).toBe(
      'PathpipeBot/1.0 (test)',
    );
  });

  it('surfaces Retry-After as it was sent', async () => {
    always('', { headers: { 'retry-after': '30' } });

    expect((await get(client(), 'https://example.com/a')).retryAfter).toBe(
      '30',
    );
  });

  // Today's behaviour: `respectRobots: false` turns off the *gate*, not the
  // fetch — robots.txt is still read once per origin for its crawl-delay.
  it('still reads robots.txt when the gate is off and the caller did not skip it', async () => {
    always('User-agent: *\nDisallow: /');

    const response = await client().request('https://example.com/a');

    expect(response.ok).toBe(true);
    expect(urlsFetched()).toEqual([
      'https://example.com/robots.txt',
      'https://example.com/a',
    ]);
  });
});

describe('json', () => {
  it('parses the body and asks for JSON', async () => {
    always('{"jobs":[1]}');

    expect(
      await client().json('https://example.com/a', { skipRobots: true }),
    ).toEqual({ jobs: [1] });
    expect(fetchMock.mock.calls[0]?.[1].headers.Accept).toBe(
      'application/json',
    );
  });

  it('answers null on a non-2xx, an empty body, or unparseable JSON', async () => {
    const http = client();

    always('{"jobs":[]}', { status: 404 });
    expect(
      await http.json('https://a.test/x', { skipRobots: true }),
    ).toBeNull();

    always('');
    expect(
      await http.json('https://b.test/x', { skipRobots: true }),
    ).toBeNull();

    always('<html>not json</html>');
    expect(
      await http.json('https://c.test/x', { skipRobots: true }),
    ).toBeNull();
  });
});

describe('the per-vendor gap', () => {
  it('leaves at least the delay between two requests to the same vendor', async () => {
    always('ok');
    const http = client({ perHostDelayMs: 60 });

    const started = Date.now();
    await get(http, 'https://example.com/a');
    await get(http, 'https://example.com/b');

    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
  });

  it('counts two subdomains of one vendor as one vendor', async () => {
    always('ok');
    const http = client({ perHostDelayMs: 60 });

    const started = Date.now();
    await get(http, 'https://acme.example.com/a');
    await get(http, 'https://other.example.com/a');

    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
  });

  it('does not make one vendor wait for another', async () => {
    always('ok');
    const http = client({ perHostDelayMs: 60 });

    const started = Date.now();
    await Promise.all([
      get(http, 'https://one.test/a'),
      get(http, 'https://two.test/a'),
    ]);

    expect(Date.now() - started).toBeLessThan(55);
  });
});

describe('the per-cycle budget', () => {
  it('stops sending to a vendor once its budget is spent', async () => {
    always('ok');
    const http = client({ maxRequestsPerHost: 2 });

    await get(http, 'https://example.com/a');
    await get(http, 'https://example.com/b');
    const third = await get(http, 'https://example.com/c');

    expect(urlsFetched()).toHaveLength(2);
    expect(third).toMatchObject({ status: 429, ok: false, body: '' });
    expect(http.pausedHosts()).toEqual(['example.com']);
  });

  it('gives the vendor its budget back at the start of the next cycle', async () => {
    always('ok');
    const http = client({ maxRequestsPerHost: 1 });

    await get(http, 'https://example.com/a');
    expect((await get(http, 'https://example.com/b')).status).toBe(429);

    http.beginCycle();

    expect((await get(http, 'https://example.com/c')).ok).toBe(true);
    expect(http.pausedHosts()).toEqual([]);
  });

  it('counts the budget per vendor, not across all of them', async () => {
    always('ok');
    const http = client({ maxRequestsPerHost: 1 });

    await get(http, 'https://one.test/a');

    expect((await get(http, 'https://two.test/a')).ok).toBe(true);
  });
});

describe('rate limiting', () => {
  it('drops the vendor for the cycle once the strikes run out', async () => {
    always('slow down', { status: 429 });
    const http = client({ maxRateLimitStrikes: 1 });

    const first = await get(http, 'https://example.com/a');
    const second = await get(http, 'https://example.com/b');

    // The 429 that earned the strike comes back as it was sent; nothing after
    // it is sent at all.
    expect(first.status).toBe(429);
    expect(urlsFetched()).toEqual(['https://example.com/a']);
    expect(second).toMatchObject({ status: 429, body: '' });
    expect(http.pausedHosts()).toEqual(['example.com']);
  });

  it('retries a 429 while strikes remain, honouring Retry-After', async () => {
    once('slow down', { status: 429, headers: { 'retry-after': '0' } });
    always('ok');
    const http = client({ maxRateLimitStrikes: 5 });

    const response = await get(http, 'https://example.com/a');

    expect(urlsFetched()).toHaveLength(2);
    expect(response.ok).toBe(true);
  });

  it('forgets the strikes once the vendor answers cleanly', async () => {
    once('slow down', { status: 429, headers: { 'retry-after': '0' } });
    always('ok');
    const http = client({ maxRateLimitStrikes: 2 });

    await get(http, 'https://example.com/a');
    await get(http, 'https://example.com/b');

    expect(http.pausedHosts()).toEqual([]);
  });
});

describe('bot filters', () => {
  it('never retries a 403 — it drops the vendor instead', async () => {
    always('Access denied', { status: 403 });
    const http = client();

    const response = await get(http, 'https://example.com/a');

    expect(response.status).toBe(403);
    expect(urlsFetched()).toHaveLength(1);
    expect(http.pausedHosts()).toEqual(['example.com']);
  });

  it('drops the vendor on a 503 that carries a challenge page', async () => {
    always('<title>Just a moment…</title>', { status: 503 });
    const http = client();

    await get(http, 'https://example.com/a');

    expect(urlsFetched()).toHaveLength(1);
    expect(http.pausedHosts()).toEqual(['example.com']);
  });

  it('retries a plain 503, which is an overloaded origin rather than a door', async () => {
    jest.useFakeTimers();
    try {
      once('upstream down', { status: 503 });
      always('ok');
      const http = client();

      const pending = get(http, 'https://example.com/a');
      await jest.advanceTimersByTimeAsync(5000);

      expect((await pending).ok).toBe(true);
      expect(urlsFetched()).toHaveLength(2);
      expect(http.pausedHosts()).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('gives up after three attempts on a transport error', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(() =>
        Promise.reject(new Error('socket hang up')),
      );
      const http = client();

      const settled = get(http, 'https://example.com/a').catch(
        (err: Error) => err.message,
      );
      await jest.advanceTimersByTimeAsync(30_000);

      expect(await settled).toBe('socket hang up');
      expect(urlsFetched()).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the body size cap', () => {
  it('discards a body the server declares as over the cap', async () => {
    always('{"jobs":[1]}', {
      headers: { 'content-length': String(64 * 1024 * 1024) },
    });

    // Discarded rather than truncated: half a JSON document parses as nothing.
    expect((await get(client(), 'https://example.com/a')).body).toBe('');
  });
});

describe('robots.txt', () => {
  const robots = (text: string): void => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/robots.txt') ? answer(text) : answer('{"jobs":[]}'),
      ),
    );
  };

  it('refuses a disallowed path with a 999 and never sends the request', async () => {
    robots('User-agent: *\nDisallow: /jobs');

    const response = await client({ respectRobots: true }).request(
      'https://example.com/jobs/1',
    );

    expect(response.status).toBe(999);
    expect(urlsFetched()).toEqual(['https://example.com/robots.txt']);
  });

  it('lets a longer Allow win over a shorter Disallow', async () => {
    robots('User-agent: *\nDisallow: /jobs\nAllow: /jobs/public');

    const response = await client({ respectRobots: true }).request(
      'https://example.com/jobs/public/1',
    );

    expect(response.ok).toBe(true);
  });

  it('prefers a group named after us over the wildcard group', async () => {
    robots(
      'User-agent: *\nDisallow: /\n\nUser-agent: PathpipeBot\nDisallow: /private',
    );

    const response = await client({ respectRobots: true }).request(
      'https://example.com/jobs/1',
    );

    expect(response.ok).toBe(true);
  });

  it('is skipped entirely when the caller asks', async () => {
    robots('User-agent: *\nDisallow: /');

    const response = await client({ respectRobots: true }).request(
      'https://example.com/jobs/1',
      { skipRobots: true },
    );

    expect(response.ok).toBe(true);
    expect(urlsFetched()).toEqual(['https://example.com/jobs/1']);
  });

  it('reads robots.txt once per origin and caches it', async () => {
    robots('User-agent: *\nAllow: /');
    const http = client({ respectRobots: true });

    await http.request('https://example.com/jobs/1');
    await http.request('https://example.com/jobs/2');

    expect(
      urlsFetched().filter((url) => url.endsWith('/robots.txt')),
    ).toHaveLength(1);
  });
});

describe('VENDOR_DELAY_MS', () => {
  // Both are called with `skipRobots`, so their published `Crawl-delay: 1` is
  // only honoured if it is in this table.
  it('honours the crawl delay published by Remote OK and Lever', () => {
    expect(VENDOR_DELAY_MS['remoteok.com']).toBeGreaterThanOrEqual(1000);
    expect(VENDOR_DELAY_MS['lever.co']).toBeGreaterThanOrEqual(1000);
  });
});
