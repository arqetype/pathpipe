import { ingestListing } from './ingest';
import { apiClient } from '@/infrastructure/api/api.client';
import type { Logger } from 'pino';
import type { DiscoveryResult, DiscoveredJob } from './types';

jest.mock('@/infrastructure/api/api.client', () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
}));

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const company = { companyId: 'c-1', companyName: 'Acme' };

const job = (over: Partial<DiscoveredJob> = {}): DiscoveredJob => ({
  title: 'Backend Engineer',
  url: 'https://jobs.example.com/1',
  ...over,
});

const result = (
  jobs: DiscoveredJob[],
  over: Partial<DiscoveryResult> = {},
): DiscoveryResult => ({
  jobs,
  ...over,
});

/** The batch endpoint, answering "everything landed". */
const acceptAll = () => {
  post.mockImplementation((path: string, body: unknown) => {
    if (path === '/job-postings/internal/batch') {
      const chunk = body as unknown[];
      return Promise.resolve({
        inserted: chunk.length,
        total: chunk.length,
        jobs: chunk.map((_, i) => ({ id: String(i) })),
      } as never);
    }
    return Promise.resolve({} as never);
  });
};

const batchCalls = () =>
  post.mock.calls.filter(([path]) => path === '/job-postings/internal/batch');

const reconcileCalls = () =>
  post.mock.calls.filter(
    ([path]) => path === '/internal/v1/job-postings/reconcile',
  );

beforeEach(() => {
  jest.clearAllMocks();
  acceptAll();
});

describe('ingestListing', () => {
  it('maps a job to the API DTO, nulling what the board did not say', async () => {
    await ingestListing(
      company,
      result([
        job({
          externalId: '42',
          description: 'Build things',
          descriptionHtml: '<p>Build things</p>',
          location: 'Paris, FR',
          parsedLocations: [
            {
              city: 'Paris',
              region: null,
              country: 'FR',
              raw: 'Paris, France',
            },
          ],
          department: 'Engineering',
          domain: 'BACKEND',
          seniority: 'SENIOR',
          employmentType: 'FULL_TIME',
          remoteType: 'HYBRID',
          salaryMin: 60000,
          salaryMax: 80000,
          salaryCurrency: 'EUR',
          postedAt: '2024-05-01T00:00:00.000Z',
          validThrough: '2024-12-01T00:00:00.000Z',
        }),
      ]),
      'greenhouse',
      logger,
    );

    expect(batchCalls()[0]?.[1]).toEqual([
      {
        title: 'Backend Engineer',
        url: 'https://jobs.example.com/1',
        externalId: '42',
        description: 'Build things',
        descriptionHtml: '<p>Build things</p>',
        location: 'Paris, FR',
        locations: [
          { city: 'Paris', region: null, country: 'FR', raw: 'Paris, France' },
        ],
        department: 'Engineering',
        domain: 'BACKEND',
        seniority: 'SENIOR',
        employmentType: 'FULL_TIME',
        remoteType: 'HYBRID',
        salaryMin: 60000,
        salaryMax: 80000,
        salaryCurrency: 'EUR',
        source: 'greenhouse',
        postedAt: '2024-05-01T00:00:00.000Z',
        validThrough: '2024-12-01T00:00:00.000Z',
        companyId: 'c-1',
      },
    ]);
  });

  it('drops an enum value the API does not know', async () => {
    await ingestListing(
      company,
      result([job({ domain: 'ASTROLOGY', employmentType: 'PERMA_TEMP' })]),
      'lever',
      logger,
    );

    const [dto] = batchCalls()[0]?.[1] as Array<Record<string, unknown>>;
    expect(dto?.domain).toBeNull();
    expect(dto?.employmentType).toBeNull();
  });

  it('sends the postings 150 at a time', async () => {
    const jobs = Array.from({ length: 301 }, (_, i) =>
      job({ externalId: String(i), url: `https://jobs.example.com/${i}` }),
    );

    const inserted = await ingestListing(
      company,
      result(jobs),
      'ashby',
      logger,
    );

    expect(batchCalls().map(([, body]) => (body as unknown[]).length)).toEqual([
      150, 150, 1,
    ]);
    expect(inserted).toBe(301);
  });

  it('keeps the chunks that landed when a later one fails', async () => {
    let call = 0;
    post.mockImplementation((path: string, body: unknown) => {
      if (path !== '/job-postings/internal/batch')
        return Promise.resolve({} as never);
      call += 1;
      if (call === 2) return Promise.reject(new Error('502'));
      const chunk = body as unknown[];
      return Promise.resolve({
        inserted: chunk.length,
        total: chunk.length,
        jobs: chunk.map((_, i) => ({ id: String(i) })),
      } as never);
    });

    const jobs = Array.from({ length: 200 }, (_, i) =>
      job({ externalId: String(i), url: `https://jobs.example.com/${i}` }),
    );

    expect(await ingestListing(company, result(jobs), 'ashby', logger)).toBe(
      150,
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('reconciles with the URLs and ids the board still lists', async () => {
    await ingestListing(
      company,
      result([
        job({ externalId: '1', url: 'https://jobs.example.com/1' }),
        job({ url: 'https://jobs.example.com/2' }),
      ]),
      'greenhouse',
      logger,
    );

    expect(reconcileCalls()[0]?.[1]).toEqual({
      companyId: 'c-1',
      source: 'greenhouse',
      urls: ['https://jobs.example.com/1', 'https://jobs.example.com/2'],
      externalIds: ['1'],
    });
  });

  it('never reconciles from a partial listing — it would close half the board', async () => {
    await ingestListing(
      company,
      result([job()], { partial: true }),
      'workday',
      logger,
    );

    expect(batchCalls()).toHaveLength(1);
    expect(reconcileCalls()).toHaveLength(0);
  });

  it('warns rather than failing when reconciliation is refused', async () => {
    post.mockImplementation((path: string, body: unknown) => {
      if (path === '/job-postings/internal/batch') {
        const chunk = body as unknown[];
        return Promise.resolve({
          inserted: chunk.length,
          total: chunk.length,
          jobs: chunk.map((_, i) => ({ id: String(i) })),
        } as never);
      }
      return Promise.reject(new Error('503'));
    });

    expect(await ingestListing(company, result([job()]), 'lever', logger)).toBe(
      1,
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('still reconciles an empty listing, so a closed board is closed', async () => {
    expect(await ingestListing(company, result([]), 'lever', logger)).toBe(0);
    expect(batchCalls()).toHaveLength(0);
    expect(reconcileCalls()[0]?.[1]).toEqual({
      companyId: 'c-1',
      source: 'lever',
      urls: [],
      externalIds: [],
    });
  });
});
