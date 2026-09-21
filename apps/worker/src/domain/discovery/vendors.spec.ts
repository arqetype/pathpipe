import {
  VENDORS,
  candidateTokens,
  probeToken,
  tokenFromInput,
} from './vendors';
import type { HttpFetcher, HttpRequestOptions, HttpResponse } from './types';

/** Answers from a table of canned bodies; no network. */
const fakeHttp = (bodies: Record<string, unknown>) => {
  const calls: string[] = [];
  const fetcher: HttpFetcher = {
    request: (
      url: string,
      _options?: HttpRequestOptions,
    ): Promise<HttpResponse> => {
      calls.push(url);
      const body = bodies[url];
      return Promise.resolve({
        status: body === undefined ? 404 : 200,
        ok: body !== undefined,
        url,
        body: typeof body === 'string' ? body : JSON.stringify(body ?? ''),
        retryAfter: null,
      });
    },
    json: <T>(url: string): Promise<T | null> => {
      calls.push(url);
      return Promise.resolve((bodies[url] ?? null) as T | null);
    },
  };
  return { calls, fetcher };
};

describe('candidateTokens', () => {
  it('uses the whole name, joined and hyphenated, plus the original spelling', () => {
    expect(candidateTokens('Cosmic Robotics')).toEqual([
      'cosmicrobotics',
      'cosmic-robotics',
      'CosmicRobotics',
    ]);
  });

  it('never shortens a name to its first word', () => {
    expect(candidateTokens('Cosmic Robotics')).not.toContain('cosmic');
  });

  it('drops legal suffixes before joining', () => {
    expect(candidateTokens('Acme Inc')).toEqual(['acme', 'AcmeInc']);
  });

  it('folds accents and spells out an ampersand', () => {
    expect(candidateTokens('Crème & Co')).toEqual([
      'cremeandco',
      'creme-and-co',
      'CrmeCo',
    ]);
  });

  it.each(['Atlas', 'Impact', 'Data', 'Labs'])(
    'refuses %j — a single generic word finds somebody else’s board',
    (name) => {
      expect(candidateTokens(name)).toEqual([]);
    },
  );

  it('keeps a generic word when it is part of a longer name', () => {
    expect(candidateTokens('Northwind Data')).toContain('northwinddata');
  });

  it('drops tokens shorter than three characters', () => {
    expect(candidateTokens('AI')).toEqual([]);
  });

  it('returns nothing for a name with no usable characters', () => {
    expect(candidateTokens('!!!')).toEqual([]);
  });
});

describe('tokenFromInput', () => {
  it.each([
    ['https://jobs.ashbyhq.com/acme', 'acme'],
    ['https://job-boards.greenhouse.io/acme', 'acme'],
    ['https://jobs.lever.co/acme/', 'acme'],
    ['https://careers.smartrecruiters.com/AcmeInc', 'AcmeInc'],
    ['acme', 'acme'],
  ])('reads %s as %s', (input, expected) => {
    expect(tokenFromInput(input)).toBe(expected);
  });

  it.each(['', '# a comment', 'two words'])('ignores %j', (input) => {
    expect(tokenFromInput(input)).toBeNull();
  });
});

describe('probeToken', () => {
  it('asks the vendors in order and stops at the first that reports open roles', async () => {
    const { calls, fetcher } = fakeHttp({
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs': {
        jobs: [{ id: 1 }, { id: 2 }],
      },
    });

    expect(await probeToken(fetcher, 'acme')).toEqual({
      platform: 'greenhouse',
      token: 'acme',
      careersUrl: 'https://job-boards.greenhouse.io/acme',
      jobCount: 2,
    });
    // Ashby is asked first and answers nothing; nothing after Greenhouse is asked.
    expect(calls).toEqual([
      'https://api.ashbyhq.com/posting-api/job-board/acme',
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
    ]);
  });

  it('does not treat a board with no open roles as a hit', async () => {
    const { fetcher } = fakeHttp({
      'https://api.ashbyhq.com/posting-api/job-board/acme': { jobs: [] },
    });

    expect(await probeToken(fetcher, 'acme')).toBeNull();
  });

  it('reads Lever’s bare array', async () => {
    const { fetcher } = fakeHttp({
      'https://api.lever.co/v0/postings/acme?mode=json&limit=1': [{ id: 'x' }],
    });

    expect(await probeToken(fetcher, 'acme')).toMatchObject({
      platform: 'lever',
      jobCount: 1,
      careersUrl: 'https://jobs.lever.co/acme',
    });
  });

  it('trusts SmartRecruiters’ own total rather than the page it returned', async () => {
    const { fetcher } = fakeHttp({
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=1': {
        totalFound: 412,
        content: [{ id: '1' }],
      },
    });

    expect(await probeToken(fetcher, 'acme')).toMatchObject({
      platform: 'smartrecruiters',
      jobCount: 412,
    });
  });

  it('counts Personio positions in the XML body, since it serves no JSON', async () => {
    const { fetcher } = fakeHttp({
      'https://orderbird.jobs.personio.de/xml':
        '<workzag-jobs><position><id>1</id></position><position><id>2</id></position></workzag-jobs>',
    });

    expect(await probeToken(fetcher, 'orderbird')).toEqual({
      platform: 'personio',
      token: 'orderbird',
      careersUrl: 'https://orderbird.jobs.personio.de',
      jobCount: 2,
    });
  });

  it('reads an empty Personio tenant as "not a board"', async () => {
    const { fetcher } = fakeHttp({
      'https://orderbird.jobs.personio.de/xml': '<workzag-jobs></workzag-jobs>',
    });

    expect(await probeToken(fetcher, 'orderbird')).toBeNull();
  });

  it('answers null when no vendor claims the token', async () => {
    const { calls, fetcher } = fakeHttp({});

    expect(await probeToken(fetcher, 'nobody')).toBeNull();
    expect(calls).toHaveLength(VENDORS.length);
  });

  it('can be pointed at a single vendor', async () => {
    const { calls, fetcher } = fakeHttp({
      'https://acme.teamtailor.com/jobs.json': { items: [{ id: '1' }] },
    });
    const teamtailor = VENDORS.filter(
      (vendor) => vendor.platform === 'teamtailor',
    );

    expect(await probeToken(fetcher, 'acme', teamtailor)).toMatchObject({
      platform: 'teamtailor',
      jobCount: 1,
    });
    expect(calls).toEqual(['https://acme.teamtailor.com/jobs.json']);
  });

  it('treats a request that throws as "not a board" rather than failing', async () => {
    const fetcher: HttpFetcher = {
      request: () => Promise.reject(new Error('DNS')),
      json: () => Promise.reject(new Error('DNS')),
    };

    expect(await probeToken(fetcher, 'acme')).toBeNull();
  });
});
