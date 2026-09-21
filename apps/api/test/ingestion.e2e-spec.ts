import request from 'supertest';

import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { JobPostingClosedReason } from '@repo/db/types/job-posting/closed-reason';

import { createHarness, seedCompany, type Harness } from './harness';

/**
 * `POST /job-postings/internal/batch` — what the crawler writes.
 *
 * Characterization only: every expectation below is what the route does today,
 * including where that is arguably wrong (see the two tests that say so).
 */
describe('POST /job-postings/internal/batch', () => {
  let harness: Harness;
  let companyId: string;

  const post = (body: string | object, status = 201) =>
    request(harness.server)
      .post('/job-postings/internal/batch')
      .set('x-api-key', harness.apiKey)
      .send(body)
      .expect(status);

  const jobs = () =>
    harness.dataSource
      .getRepository(JobPosting)
      .find({ order: { url: 'ASC' } });

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
    companyId = (await seedCompany(harness, 'Acme')).id;
  });

  it('rejects a batch without the API key', async () => {
    await request(harness.server)
      .post('/job-postings/internal/batch')
      .send([])
      .expect(401);
  });

  it('inserts new offers and reports exactly what was new', async () => {
    const response = await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        location: 'Paris, France',
        employmentType: EmploymentType.FULL_TIME,
      },
      {
        companyId,
        title: 'Frontend Engineer',
        url: 'https://boards.example.com/acme/2',
        location: 'Lyon, France',
      },
    ]);

    expect(response.body).toMatchObject({ inserted: 2, total: 2 });
    const stored = await jobs();
    expect(stored.map((job) => job.title)).toEqual([
      'Backend Engineer',
      'Frontend Engineer',
    ]);
    expect(stored[0].dedupKey).toBe('backend engineer|paris');
    expect(stored[0].employmentType).toBe(EmploymentType.FULL_TIME);
    expect(stored[0].lastSeenAt).not.toBeNull();
  });

  it('does not duplicate the same offer submitted twice', async () => {
    const offer = {
      companyId,
      title: 'Backend Engineer',
      url: 'https://boards.example.com/acme/1',
      location: 'Paris, France',
    };

    const first = await post([offer]);
    const second = await post([offer]);

    expect(first.body).toMatchObject({ inserted: 1, total: 1 });
    expect(second.body).toMatchObject({ inserted: 0, total: 1 });
    expect(await harness.dataSource.getRepository(JobPosting).count()).toBe(1);
  });

  it('updates rather than duplicates when the URL moved but the ATS id did not', async () => {
    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/old-slug',
        externalId: 'ats-42',
        location: 'Paris, France',
        department: 'Platform',
      },
    ]);

    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/new-slug',
        externalId: 'ats-42',
        location: 'Paris, France',
        department: 'Infrastructure',
      },
    ]);

    const stored = await jobs();
    expect(stored).toHaveLength(1);
    expect(stored[0].department).toBe('Infrastructure');
    // The merge never writes `url`, so the row keeps the slug it was
    // discovered under even though the board has moved on.
    expect(stored[0].url).toBe('https://boards.example.com/acme/old-slug');
  });

  it('collapses a posting that was renamed AND moved, on its ATS id', async () => {
    // Neither the URL nor `dedupKey` survives a rename plus a slug change; the
    // partial unique index on (companyId, externalId) is what catches it.
    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/old-slug',
        externalId: 'ats-42',
        location: 'Paris, France',
      },
    ]);
    const second = await post([
      {
        companyId,
        title: 'Senior Backend Engineer',
        url: 'https://boards.example.com/acme/new-slug',
        externalId: 'ats-42',
        location: 'Paris, France',
      },
    ]);

    expect(second.body).toMatchObject({ inserted: 0, total: 1 });
    const stored = await jobs();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('Senior Backend Engineer');
    // `dedupKey` is only ever written on insert, so it still spells the old
    // title — a third board posting the new title would not collapse onto it.
    expect(stored[0].dedupKey).toBe('backend engineer|paris');
  });

  it('collapses the same role posted on a second board via dedupKey', async () => {
    await post([
      {
        companyId,
        title: 'Data Engineer',
        url: 'https://greenhouse.example.com/acme/7',
        source: 'https://greenhouse.example.com/acme',
        locations: [{ city: 'Paris', country: 'FR' }],
      },
    ]);

    const second = await post([
      {
        companyId,
        title: 'Data Engineer',
        url: 'https://lever.example.com/acme/data-engineer',
        source: 'https://lever.example.com/acme',
        locations: [{ city: 'Paris', country: 'FR' }],
      },
    ]);

    expect(second.body).toMatchObject({ inserted: 0, total: 1 });
    const stored = await jobs();
    expect(stored).toHaveLength(1);
    expect(stored[0].dedupKey).toBe('data engineer|paris');
    // The second board wins the columns the merge does write.
    expect(stored[0].source).toBe('https://lever.example.com/acme');
  });

  it('never blanks a field a later, poorer pass says nothing about', async () => {
    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        location: 'Paris, France',
        description: 'We run Postgres at scale.',
        descriptionHtml: '<p>We run Postgres at scale.</p>',
        department: 'Platform',
        employmentType: EmploymentType.FULL_TIME,
        salaryMin: 60000,
        salaryMax: 80000,
        salaryCurrency: 'EUR',
      },
    ]);

    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        location: 'Paris, France',
      },
    ]);

    const [stored] = await jobs();
    expect(stored).toMatchObject({
      description: 'We run Postgres at scale.',
      descriptionHtml: '<p>We run Postgres at scale.</p>',
      department: 'Platform',
      employmentType: EmploymentType.FULL_TIME,
      salaryMin: 60000,
      salaryMax: 80000,
      salaryCurrency: 'EUR',
    });
  });

  it('reopens an offer that a previous pass had closed', async () => {
    const offer = {
      companyId,
      title: 'Backend Engineer',
      url: 'https://boards.example.com/acme/1',
      location: 'Paris, France',
    };
    await post([offer]);
    await harness.dataSource
      .getRepository(JobPosting)
      .createQueryBuilder()
      .update(JobPosting)
      .set({
        closedAt: new Date(),
        closedReason: JobPostingClosedReason.REMOVED_FROM_LISTING,
      })
      .where('1 = 1')
      .execute();

    await post([offer]);

    const [stored] = await jobs();
    expect(stored.closedAt).toBeNull();
    expect(stored.closedReason).toBeNull();
  });

  it("brings the offer's places in line with the latest pass", async () => {
    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        locations: [
          { city: 'Paris', country: 'FR' },
          { city: 'Lyon', country: 'FR' },
        ],
      },
    ]);

    await post([
      {
        companyId,
        title: 'Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        locations: [{ city: 'Paris', country: 'FR' }],
      },
    ]);

    const places = await harness.dataSource
      .getRepository(JobPostingLocation)
      .find();
    expect(places.map((place) => place.city)).toEqual(['Paris']);
  });

  it('stores the domain and seniority the crawler classified', async () => {
    // The crawler reads both off the title at ingest, and `domain` is the
    // single heaviest scoring criterion — dropping them here used to leave it
    // NULL on every offer, which silently removed the criterion from the score.
    await post([
      {
        companyId,
        title: 'Senior Backend Engineer',
        url: 'https://boards.example.com/acme/1',
        domain: 'BACKEND',
        seniority: 'SENIOR',
      },
    ]);

    const [stored] = await jobs();
    expect(stored.domain).toBe('BACKEND');
    expect(stored.seniority).toBe('SENIOR');
  });

  it('keeps a classification a later, thinner pass no longer carries', async () => {
    const job = {
      companyId,
      title: 'Senior Backend Engineer',
      url: 'https://boards.example.com/acme/1',
      domain: 'BACKEND',
      seniority: 'SENIOR',
    };
    await post([job]);
    await post([{ ...job, domain: null, seniority: null }]);

    const [stored] = await jobs();
    expect(stored.domain).toBe('BACKEND');
    expect(stored.seniority).toBe('SENIOR');
  });

  it('accepts an empty batch', async () => {
    const response = await post([]);
    expect(response.body).toEqual({ inserted: 0, total: 0, jobs: [] });
  });
});
