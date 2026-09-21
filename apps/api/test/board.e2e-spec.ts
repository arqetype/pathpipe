import request from 'supertest';

import type {
  JobPostingResponse,
  PaginatedJobPostings,
} from '@repo/db/query/job-posting';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';

import {
  createHarness,
  getAs,
  seedCompany,
  seedJob,
  type Harness,
} from './harness';

/**
 * `GET /job-postings` — the board, with no profile in play.
 *
 * Five fixtures, four of them open, each carrying one distinguishing value per
 * filter dimension. Every assertion names the exact offers expected.
 */
describe('GET /job-postings', () => {
  let harness: Harness;

  /** Fixture ids, by the name each test refers to them with. */
  const id: Record<string, string> = {};

  const board = (query = ''): Promise<PaginatedJobPostings> =>
    getAs<PaginatedJobPostings>(harness, `/job-postings${query}`);

  const ids = (page: PaginatedJobPostings): string[] =>
    page.data.map((job) => job.id);

  /** Filter assertions sort by title, so the expected array is unambiguous. */
  const byTitle = (query: string): Promise<PaginatedJobPostings> =>
    board(`?sortBy=title&sortOrder=asc&${query}`);

  beforeAll(async () => {
    harness = await createHarness();
    await harness.reset();

    const acme = await seedCompany(harness, 'Acme', CompanyIndustry.SOFTWARE);
    const globex = await seedCompany(
      harness,
      'Globex',
      CompanyIndustry.FINANCE,
    );

    id.backend = (
      await seedJob(harness, {
        companyId: acme.id,
        title: 'Senior Backend Engineer',
        url: 'https://acme.example.com/1',
        department: 'Engineering',
        places: [{ city: 'Paris', country: 'FR' }],
        remoteType: RemoteType.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        salaryMin: 60000,
        salaryMax: 70000,
        salaryCurrency: 'EUR',
        postedAt: new Date('2026-03-01T00:00:00Z'),
      })
    ).id;

    id.frontend = (
      await seedJob(harness, {
        companyId: acme.id,
        title: 'Frontend Engineer',
        url: 'https://acme.example.com/2',
        department: 'Engineering',
        places: [{ city: 'Lyon', country: 'FR' }],
        remoteType: RemoteType.ON_SITE,
        employmentType: EmploymentType.INTERNSHIP,
        postedAt: new Date('2026-02-01T00:00:00Z'),
      })
    ).id;

    id.data = (
      await seedJob(harness, {
        companyId: globex.id,
        title: 'Data Scientist',
        url: 'https://globex.example.com/3',
        department: 'Data',
        description: 'Machine learning on payment data.',
        places: [{ city: 'Berlin', country: 'DE' }],
        remoteType: RemoteType.HYBRID,
        employmentType: EmploymentType.FULL_TIME,
        salaryMax: 90000,
        salaryCurrency: 'EUR',
        postedAt: new Date('2026-01-15T00:00:00Z'),
      })
    ).id;

    id.sales = (
      await seedJob(harness, {
        companyId: globex.id,
        title: 'Account Executive',
        url: 'https://globex.example.com/4',
        department: 'Sales',
        places: [{ city: 'Berlin', country: 'DE' }],
        remoteType: RemoteType.ON_SITE,
        employmentType: EmploymentType.CONTRACT,
        postedAt: new Date('2026-01-01T00:00:00Z'),
      })
    ).id;

    id.closed = (
      await seedJob(harness, {
        companyId: acme.id,
        title: 'Closed Role',
        url: 'https://acme.example.com/5',
        places: [{ city: 'Paris', country: 'FR' }],
        postedAt: new Date('2026-02-15T00:00:00Z'),
        closedAt: new Date('2026-03-10T00:00:00Z'),
      })
    ).id;
  });

  afterAll(async () => {
    await harness.close();
  });

  it('returns the open offers, freshest first, with the default page', async () => {
    const page = await board();

    expect(ids(page)).toEqual([id.backend, id.frontend, id.data, id.sales]);
    expect(page).toMatchObject({ total: 4, page: 1, limit: 25 });
    expect(page.hasProfile).toBe(false);
    expect(page.data[0].matchScore).toBeNull();
    expect(page.data[0].status).toBe('NEW');
    expect(page.data[0].saved).toBe(false);
    expect(page.data[0].companyName).toBe('Acme');
    expect(page.data[0].locations).toEqual([
      { city: 'Paris', region: null, country: 'FR', raw: 'Paris, FR' },
    ]);
  });

  it('paginates without changing the order', async () => {
    const first = await board('?limit=2&page=1');
    const second = await board('?limit=2&page=2');

    expect(ids(first)).toEqual([id.backend, id.frontend]);
    expect(ids(second)).toEqual([id.data, id.sales]);
    expect(second).toMatchObject({ total: 4, page: 2, limit: 2 });
  });

  it('clamps the page size to 1..100', async () => {
    expect((await board('?limit=500')).limit).toBe(100);
    // `0` is a number, not an absent one, so it clamps up to 1 rather than
    // falling back to the default of 25.
    expect((await board('?limit=0')).limit).toBe(1);
  });

  it('sorts by title, company and salary on request', async () => {
    expect(ids(await board('?sortBy=title&sortOrder=asc'))).toEqual([
      id.sales,
      id.data,
      id.frontend,
      id.backend,
    ]);
    // Company sorting has no tie-break beyond the offer id, so only the
    // grouping is pinned here.
    const byCompany = await board('?sortBy=company&sortOrder=desc');
    expect(byCompany.data.map((job) => job.companyName)).toEqual([
      'Globex',
      'Globex',
      'Acme',
      'Acme',
    ]);
    expect(ids(byCompany).slice(0, 2).sort()).toEqual(
      [id.data, id.sales].sort(),
    );
    // NULLS LAST, so the two offers with no published salary sit at the end.
    expect(
      ids(await board('?sortBy=salaryMax&sortOrder=desc')).slice(0, 2),
    ).toEqual([id.data, id.backend]);
  });

  it('filters by city', async () => {
    expect(ids(await byTitle('city=Paris'))).toEqual([id.backend]);
    expect(ids(await byTitle('city=Paris&city=Lyon'))).toEqual([
      id.frontend,
      id.backend,
    ]);
  });

  it('filters by country, case-insensitively', async () => {
    expect(ids(await byTitle('country=de'))).toEqual([id.sales, id.data]);
  });

  it('filters by remote type', async () => {
    expect(ids(await byTitle('remoteType=REMOTE'))).toEqual([id.backend]);
    expect(ids(await byTitle('remoteType=ON_SITE'))).toEqual([
      id.sales,
      id.frontend,
    ]);
  });

  it('filters by employment type', async () => {
    expect(ids(await byTitle('employmentType=FULL_TIME'))).toEqual([
      id.data,
      id.backend,
    ]);
  });

  it('filters by department', async () => {
    expect(ids(await byTitle('department=Engineering'))).toEqual([
      id.frontend,
      id.backend,
    ]);
  });

  it('filters by company', async () => {
    const acmeId = (await board()).data.find(
      (job) => job.id === id.backend,
    )?.companyId;
    expect(ids(await byTitle(`companyId=${acmeId}`))).toEqual([
      id.frontend,
      id.backend,
    ]);
  });

  it('filters by a salary floor, keeping offers that publish none', async () => {
    // An unpriced offer is not evidence that it pays less, but the filter is a
    // floor on the published figure — so unpriced offers drop out.
    expect(ids(await byTitle('salaryMin=80000'))).toEqual([id.data]);
    expect(ids(await byTitle('salaryMin=65000'))).toEqual([
      id.data,
      id.backend,
    ]);
  });

  it('searches the offer text and the company name', async () => {
    expect(ids(await byTitle('search=engineer'))).toEqual([
      id.frontend,
      id.backend,
    ]);
    // 'machine' only appears in one description.
    expect(ids(await byTitle('search=machine'))).toEqual([id.data]);
    // A company name is matched even though it is not in the offer's vector.
    expect(ids(await byTitle('search=Globex'))).toEqual([id.sales, id.data]);
    expect(ids(await byTitle('search=nothingmatchesthis'))).toEqual([]);
  });

  it('filters by how recently an offer was published', async () => {
    const days = Math.ceil(
      (Date.now() - new Date('2026-02-10T00:00:00Z').getTime()) / 86_400_000,
    );
    expect(ids(await byTitle(`postedWithinDays=${days}`))).toEqual([
      id.backend,
    ]);
  });

  it('hides closed offers unless asked for them', async () => {
    expect(ids(await byTitle(''))).not.toContain(id.closed);
    expect(ids(await byTitle('includeClosed=true'))).toEqual([
      id.sales,
      id.closed,
      id.data,
      id.frontend,
      id.backend,
    ]);
  });

  it('counts the facets with each dimension lifting its own filter', async () => {
    const page = await board('?city=Paris');

    expect(page.facets.cities).toEqual(
      expect.arrayContaining([
        { value: 'Paris', label: 'Paris', count: 1 },
        { value: 'Lyon', label: 'Lyon', count: 1 },
        { value: 'Berlin', label: 'Berlin', count: 2 },
      ]),
    );
    // Every other dimension is still narrowed to Paris.
    expect(page.facets.companies).toEqual([
      { value: expect.any(String) as string, label: 'Acme', count: 1 },
    ]);
    expect(page.facets.countries).toEqual([
      { value: 'FR', label: 'FR', count: 1 },
    ]);
  });

  it('returns one offer, and 404s for an id that is not there', async () => {
    const job = await getAs<JobPostingResponse>(
      harness,
      `/job-postings/${id.data}`,
    );
    expect(job).toMatchObject({
      id: id.data,
      title: 'Data Scientist',
      companyName: 'Globex',
      status: 'NEW',
      saved: false,
      applicationId: null,
      matchScore: null,
      followed: false,
    });

    await getAs(
      harness,
      '/job-postings/00000000-0000-0000-0000-000000000000',
      404,
    );
  });

  it('refuses a request with no token', async () => {
    await request(harness.server).get('/job-postings').expect(401);
  });
});
