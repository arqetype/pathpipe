import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedBoards } from './seed';
import { apiClient } from '@/infrastructure/api/api.client';
import type { HttpRequestOptions, HttpResponse } from './types';

jest.mock('@/infrastructure/http/http', () => {
  const answers = new Map<string, unknown>();
  const requested: string[] = [];
  return {
    answers,
    requested,
    HttpClient: class {
      json(url: string): Promise<unknown> {
        requested.push(url);
        return Promise.resolve(answers.get(url) ?? null);
      }
      request(
        url: string,
        _options?: HttpRequestOptions,
      ): Promise<HttpResponse> {
        requested.push(url);
        const body = answers.get(url);
        return Promise.resolve({
          status: body === undefined ? 404 : 200,
          ok: body !== undefined,
          url,
          body: typeof body === 'string' ? body : JSON.stringify(body ?? ''),
          retryAfter: null,
        });
      }
    },
  };
});

jest.mock('@/infrastructure/api/api.client', () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

const { answers, requested } = jest.requireMock(
  '@/infrastructure/http/http',
) as {
  answers: Map<string, unknown>;
  requested: string[];
};

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const ashbyBoard = (token: string, jobs = 3): void => {
  answers.set(`https://api.ashbyhq.com/posting-api/job-board/${token}`, {
    jobs: Array.from({ length: jobs }, (_, i) => ({ id: String(i) })),
  });
};

const fileOf = (lines: string[]): string => {
  const path = join(mkdtempSync(join(tmpdir(), 'seed-')), 'boards.txt');
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  return path;
};

const seededCompanies = (): Array<{ name: string; careersUrl: string }> => {
  const call = post.mock.calls.find(
    ([path]) => path === '/internal/v1/companies/seed',
  );
  return (
    call?.[1] as { companies: Array<{ name: string; careersUrl: string }> }
  ).companies;
};

beforeEach(() => {
  jest.clearAllMocks();
  answers.clear();
  requested.length = 0;
  post.mockResolvedValue({ created: 1, updated: 0, unchanged: 0 } as never);
});

describe('seedBoards from a file', () => {
  it('confirms one board when two spellings of its name both answer', async () => {
    ashbyBoard('everai');
    ashbyBoard('EverAI');

    const confirmed = await seedBoards({
      file: fileOf(['everai', 'EverAI']),
      log: () => {},
    });

    expect(confirmed).toHaveLength(1);
    expect(seededCompanies()).toEqual([
      {
        name: 'everai',
        careersUrl: 'https://jobs.ashbyhq.com/everai',
        source: 'ashby',
      },
    ]);
  });

  it('prefers the plain lowercase spelling whichever order they arrive in', async () => {
    ashbyBoard('everai');
    ashbyBoard('EverAI');

    const confirmed = await seedBoards({
      file: fileOf(['EverAI', 'everai']),
      log: () => {},
    });

    expect(confirmed.map((hit) => hit.token)).toEqual(['everai']);
  });

  it('keeps two different boards on the same vendor apart', async () => {
    ashbyBoard('everai', 3);
    ashbyBoard('northwind', 7);

    const confirmed = await seedBoards({
      file: fileOf(['everai', 'northwind']),
      log: () => {},
    });

    expect(confirmed.map((hit) => hit.token)).toEqual(['northwind', 'everai']);
  });

  it('names the company after the board, not after the label guessed from', async () => {
    ashbyBoard('acme');

    await seedBoards({ file: fileOf(['acme']), log: () => {} });

    expect(seededCompanies()[0]?.name).toBe('acme');
  });

  it('writes nothing on a dry run', async () => {
    ashbyBoard('acme');

    const confirmed = await seedBoards({
      file: fileOf(['acme']),
      dryRun: true,
      log: () => {},
    });

    expect(confirmed).toHaveLength(1);
    expect(post).not.toHaveBeenCalled();
  });

  it('returns nothing, and asks nobody, when no candidate is found', async () => {
    const confirmed = await seedBoards({
      file: fileOf(['# just a comment', '']),
      log: () => {},
    });

    expect(confirmed).toEqual([]);
    expect(requested).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('does not seed a token that no vendor claims', async () => {
    const confirmed = await seedBoards({
      file: fileOf(['nobodyshome']),
      log: () => {},
    });

    expect(confirmed).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });
});

describe('seedBoards from the public job feeds', () => {
  const FEED_HOSTS = /himalayas|arbeitnow|remoteok|jobicy/;
  const feedNames = (): string[] =>
    requested.filter((url) => FEED_HOSTS.test(url));

  it('splits the budget evenly across the four feeds instead of first-come', async () => {
    answers.set('https://himalayas.app/jobs/api?limit=20', {
      jobs: [{ companySlug: 'alpha' }],
      nextCursor: 'c2',
    });
    answers.set('https://himalayas.app/jobs/api?limit=20&cursor=c2', {
      jobs: [{ companySlug: 'beta' }],
      nextCursor: 'c3',
    });
    answers.set('https://www.arbeitnow.com/api/job-board-api?page=1', {
      data: [{ company_name: 'gamma' }],
    });
    answers.set('https://www.arbeitnow.com/api/job-board-api?page=2', {
      data: [{ company_name: 'delta' }],
    });
    answers.set('https://remoteok.com/api', [
      { company: 'epsilon' },
      { company: 'zeta' },
    ]);
    answers.set('https://jobicy.com/api/v2/remote-jobs?count=50', {
      jobs: [{ companyName: 'eta' }, { companyName: 'theta' }],
    });

    await seedBoards({ feeds: true, limit: 8, log: () => {} });

    expect(feedNames()).toEqual([
      'https://himalayas.app/jobs/api?limit=20',
      'https://himalayas.app/jobs/api?limit=20&cursor=c2',
      'https://www.arbeitnow.com/api/job-board-api?page=1',
      'https://www.arbeitnow.com/api/job-board-api?page=2',
      'https://remoteok.com/api',
      'https://jobicy.com/api/v2/remote-jobs?count=50',
    ]);
  });

  it('stops a feed that runs out of pages before its share is filled', async () => {
    answers.set('https://himalayas.app/jobs/api?limit=20', {
      jobs: [{ companySlug: 'alpha' }],
      nextCursor: null,
    });

    await seedBoards({ feeds: true, limit: 8, log: () => {} });

    expect(feedNames()).toEqual([
      'https://himalayas.app/jobs/api?limit=20',
      'https://www.arbeitnow.com/api/job-board-api?page=1',
      'https://remoteok.com/api',
      'https://jobicy.com/api/v2/remote-jobs?count=50',
    ]);
  });

  it('probes the names the feeds gave and seeds the boards behind them', async () => {
    answers.set('https://jobicy.com/api/v2/remote-jobs?count=50', {
      jobs: [{ companyName: 'Northwind Data' }],
    });
    ashbyBoard('northwinddata', 4);

    const confirmed = await seedBoards({
      feeds: true,
      limit: 4,
      log: () => {},
    });

    expect(confirmed).toEqual([
      {
        platform: 'ashby',
        token: 'northwinddata',
        careersUrl: 'https://jobs.ashbyhq.com/northwinddata',
        jobCount: 4,
        label: 'Northwind Data',
      },
    ]);
  });
});
