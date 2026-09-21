import { JobDiscoveryService } from './pipeline';
import type { HttpClient } from '@/infrastructure/http/http';
import type { HttpRequestOptions } from './types';

const BOARD = 'https://job-boards.greenhouse.io/acme';
const FULL =
  'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true';
const LIGHT = 'https://boards-api.greenhouse.io/v1/boards/acme/jobs';

const ghJob = (id: string, title = `Engineer ${id}`) => ({
  id,
  title,
  absolute_url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
  location: { name: 'Paris, France' },
});

const fakeClient = (
  answer: (url: string, options?: HttpRequestOptions) => unknown,
) => {
  const calls: string[] = [];
  const client = {
    request: (url: string, options?: HttpRequestOptions) => {
      calls.push(url);
      const body = answer(url, options);
      return Promise.resolve({
        status: 200,
        ok: true,
        url,
        body: JSON.stringify(body ?? ''),
        retryAfter: null,
      });
    },
    json: (url: string, options?: HttpRequestOptions) => {
      calls.push(url);
      return Promise.resolve(answer(url, options) ?? null);
    },
  };
  return { calls, client: client as unknown as HttpClient };
};

const discovery = (client: HttpClient, respectRobotsForAts = false) =>
  new JobDiscoveryService({ http: client, respectRobotsForAts });

describe('JobDiscoveryService.discover', () => {
  it('reads a board through its adapter and fingerprints the result', async () => {
    const { client } = fakeClient((url) =>
      url === FULL ? { jobs: [ghJob('1'), ghJob('2')] } : undefined,
    );

    const result = await discovery(client).discover(BOARD);

    expect(result.jobs).toHaveLength(2);
    expect(result.strategy).toBe('ats-api');
    expect(result.platform).toBe('greenhouse');
    expect(result.resolvedUrl).toBe(BOARD);
    expect(result.notModified).toBe(false);
    expect(result.partial).toBe(false);
    expect(result.fingerprint).toEqual({
      etag: null,
      lastModified: null,
      contentHash: expect.stringMatching(/^[0-9a-f]{40}$/),
      jobCount: 2,
    });
  });

  it('answers with an error when no adapter claims the URL', async () => {
    const { client, calls } = fakeClient(() => undefined);

    const result = await discovery(client).discover(
      'https://careers.example.com/jobs',
    );

    expect(result.jobs).toEqual([]);
    expect(result.error).toMatch(/No ATS adapter claims this URL/);
    expect(result.platform).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('reports no error when the board is read and lists nothing', async () => {
    const { client } = fakeClient(() => ({ jobs: [] }));

    const result = await discovery(client).discover(BOARD);

    expect(result.jobs).toEqual([]);
    expect(result.platform).toBe('greenhouse');
    expect(result.error).toBeUndefined();
  });

  it('reports the failure when the adapter throws', async () => {
    const { client } = fakeClient(() => {
      throw new Error('socket hang up');
    });

    const result = await discovery(client).discover(BOARD);

    expect(result.jobs).toEqual([]);
    expect(result.error).toBe('Board request failed: socket hang up');
  });

  it('reports notModified when the content hash matches the previous run', async () => {
    const { client } = fakeClient((url) =>
      url === FULL ? { jobs: [ghJob('1')] } : undefined,
    );
    const service = discovery(client);

    const first = await service.discover(BOARD);
    const second = await service.discover(BOARD, {
      previous: { contentHash: first.fingerprint?.contentHash },
    });

    expect(second.notModified).toBe(true);
    expect(second.jobs).toHaveLength(1);
  });

  it('tells the ATS adapters to skip the robots.txt gate by default', async () => {
    const seen: Array<HttpRequestOptions | undefined> = [];
    const { client } = fakeClient((url, options) => {
      seen.push(options);
      return url === FULL ? { jobs: [ghJob('1')] } : undefined;
    });

    await discovery(client).discover(BOARD);

    expect(seen[0]?.skipRobots).toBe(true);
  });

  it('leaves the robots.txt gate in place when asked to respect it', async () => {
    const seen: Array<HttpRequestOptions | undefined> = [];
    const { client } = fakeClient((url, options) => {
      seen.push(options);
      return url === FULL ? { jobs: [ghJob('1')] } : undefined;
    });

    await discovery(client, true).discover(BOARD);

    expect(seen[0]?.skipRobots).toBeUndefined();
  });
});

describe('the fast pass', () => {
  it('stops at the cheap listing when the job set has not changed', async () => {
    const { client, calls } = fakeClient((url) =>
      url === LIGHT || url === FULL ? { jobs: [ghJob('1')] } : undefined,
    );
    const service = discovery(client);

    const first = await service.discover(BOARD);
    calls.length = 0;

    const second = await service.discover(BOARD, {
      fastOnly: true,
      previous: { contentHash: first.fingerprint?.contentHash },
    });

    expect(calls).toEqual([LIGHT]);
    expect(second.notModified).toBe(true);
  });

  it('fetches the full payload once the cheap listing proves a change', async () => {
    const { client, calls } = fakeClient((url) => {
      if (url === LIGHT) return { jobs: [ghJob('1'), ghJob('2')] };
      if (url === FULL) {
        return {
          jobs: [
            { ...ghJob('1'), content: '&lt;p&gt;Build&lt;/p&gt;' },
            ghJob('2'),
          ],
        };
      }
      return undefined;
    });

    const result = await discovery(client).discover(BOARD, {
      fastOnly: true,
      previous: { contentHash: 'a-hash-from-a-different-job-set' },
    });

    expect(calls).toEqual([LIGHT, FULL]);
    expect(result.jobs).toHaveLength(2);
    expect(result.notModified).toBe(false);
    expect(result.jobs.find((job) => job.externalId === '1')?.description).toBe(
      'Build',
    );
  });

  it('keeps the cheap listing when the full pass comes back empty', async () => {
    const { client } = fakeClient((url) =>
      url === LIGHT ? { jobs: [ghJob('1')] } : { jobs: [] },
    );

    const result = await discovery(client).discover(BOARD, {
      fastOnly: true,
      previous: { contentHash: 'stale' },
    });

    expect(result.jobs).toHaveLength(1);
  });

  it('does not ask for the full payload when the cheap listing is empty', async () => {
    const { client, calls } = fakeClient(() => ({ jobs: [] }));

    await discovery(client).discover(BOARD, { fastOnly: true });

    expect(calls).toEqual([LIGHT]);
  });
});

describe('the partial flag', () => {
  const TT = 'https://polestar.teamtailor.com/jobs';
  const feedItem = (id: string) => ({
    id,
    title: `Engineer ${id}`,
    url: `https://polestar.teamtailor.com/jobs/${id}`,
  });

  it('is set when the adapter says it stopped before the end of the board', async () => {
    let page = 0;
    const { client } = fakeClient(() => ({
      items: [feedItem(String(++page))],
    }));

    const result = await discovery(client).discover(TT);

    expect(result.partial).toBe(true);
    expect(result.jobs).toHaveLength(20);
  });

  it('is false when the adapter read the whole board', async () => {
    const { client } = fakeClient((url) =>
      url.includes('page=2') ? { items: [] } : { items: [feedItem('1')] },
    );

    const result = await discovery(client).discover(TT);

    expect(result.partial).toBe(false);
  });
});
