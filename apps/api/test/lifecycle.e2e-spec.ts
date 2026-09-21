import request from 'supertest';

import { Application } from '@repo/db/entities/application';
import { JobPosting } from '@repo/db/entities/job-posting';
import type {
  JobPostingResponse,
  PaginatedJobPostings,
} from '@repo/db/query/job-posting';

import {
  createHarness,
  getAs,
  seedCompany,
  seedJob,
  type Harness,
} from './harness';

/** An offer's life after ingestion: closing it, and what the user does with it. */
describe('job posting lifecycle', () => {
  let harness: Harness;
  let companyId: string;

  const BOARD_A = 'https://boards.example.com/acme';
  const BOARD_B = 'https://lever.example.com/acme';

  const reconcile = (body: string | object, status = 200) =>
    request(harness.server)
      .post('/internal/v1/job-postings/reconcile')
      .set('x-api-key', harness.apiKey)
      .send(body)
      .expect(status);

  const stored = (id: string) =>
    harness.dataSource
      .getRepository(JobPosting)
      .findOneByOrFail({ id })
      .then((job) => job);

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

  describe('POST /internal/v1/job-postings/reconcile', () => {
    it('closes what the listing no longer names and leaves other sources alone', async () => {
      const kept = await seedJob(harness, {
        companyId,
        title: 'Backend Engineer',
        url: `${BOARD_A}/1`,
        source: BOARD_A,
      });
      const gone = await seedJob(harness, {
        companyId,
        title: 'Frontend Engineer',
        url: `${BOARD_A}/2`,
        source: BOARD_A,
      });
      const otherBoard = await seedJob(harness, {
        companyId,
        title: 'Data Engineer',
        url: `${BOARD_B}/3`,
        source: BOARD_B,
      });

      const response = await reconcile({
        companyId,
        source: BOARD_A,
        urls: [`${BOARD_A}/1`],
      });

      expect(response.body).toEqual({ closed: 1 });
      expect((await stored(kept.id)).closedAt).toBeNull();
      expect((await stored(gone.id)).closedReason).toBe('REMOVED_FROM_LISTING');
      expect((await stored(otherBoard.id)).closedAt).toBeNull();
    });

    it('closes nothing when the listing names nothing', async () => {
      await seedJob(harness, {
        companyId,
        title: 'Backend Engineer',
        url: `${BOARD_A}/1`,
        source: BOARD_A,
      });

      // An empty listing is treated as "we learned nothing", not "the board is
      // empty" — the one case where a complete crawl is not trusted.
      expect(
        (await reconcile({ companyId, source: BOARD_A, urls: [] })).body,
      ).toEqual({ closed: 0 });
      expect(
        await harness.dataSource
          .getRepository(JobPosting)
          .countBy({ closedAt: null as unknown as undefined }),
      ).toBe(1);
    });

    it('keeps an offer whose ATS id is still listed even under a new URL', async () => {
      const moved = await seedJob(harness, {
        companyId,
        title: 'Backend Engineer',
        url: `${BOARD_A}/old`,
        externalId: 'ats-1',
        source: BOARD_A,
      });

      await reconcile({
        companyId,
        source: BOARD_A,
        urls: [`${BOARD_A}/new`],
        externalIds: ['ats-1'],
      });

      expect((await stored(moved.id)).closedAt).toBeNull();
    });

    it('rejects a reconcile without the API key', async () => {
      await request(harness.server)
        .post('/internal/v1/job-postings/reconcile')
        .send({ companyId, source: BOARD_A, urls: [] })
        .expect(401);
    });
  });

  describe('per-user interactions', () => {
    let jobId: string;

    beforeEach(async () => {
      jobId = (
        await seedJob(harness, {
          companyId,
          title: 'Backend Engineer',
          url: `${BOARD_A}/1`,
          source: BOARD_A,
          places: [{ city: 'Paris', country: 'FR' }],
        })
      ).id;
    });

    it('marks an offer with a status, which the board then filters on', async () => {
      await request(harness.server)
        .patch(`/job-postings/${jobId}/status`)
        .set('Cookie', harness.cookie)
        .send({ status: 'DISMISSED' })
        .expect(200);

      const dismissed = await getAs<PaginatedJobPostings>(
        harness,
        '/job-postings?status=DISMISSED',
      );
      expect(dismissed.data.map((job) => job.id)).toEqual([jobId]);
      // Dismissing does not hide the offer from an unfiltered board.
      expect(
        (await getAs<PaginatedJobPostings>(harness, '/job-postings')).total,
      ).toBe(1);
      // Nor is it counted as new any more.
      expect(
        await getAs<{ count: number }>(harness, '/job-postings/count'),
      ).toEqual({ count: 0 });
    });

    it('saves and unsaves an offer', async () => {
      const saved = await request(harness.server)
        .patch(`/job-postings/${jobId}/saved`)
        .set('Cookie', harness.cookie)
        .send({ saved: true })
        .expect(200);
      expect((saved.body as JobPostingResponse).saved).toBe(true);
      // Saving is what creates the row, and a fresh row reads as SEEN.
      expect((saved.body as JobPostingResponse).status).toBe('SEEN');

      expect(
        (
          await getAs<PaginatedJobPostings>(harness, '/job-postings?saved=true')
        ).data.map((job) => job.id),
      ).toEqual([jobId]);

      await request(harness.server)
        .patch(`/job-postings/${jobId}/saved`)
        .set('Cookie', harness.cookie)
        .send({ saved: false })
        .expect(200);
      expect(
        (await getAs<PaginatedJobPostings>(harness, '/job-postings?saved=true'))
          .total,
      ).toBe(0);
    });

    it('pushes an offer onto the applications board once', async () => {
      const first = await request(harness.server)
        .post(`/job-postings/${jobId}/application`)
        .set('Cookie', harness.cookie)
        .send({})
        .expect(201);
      const second = await request(harness.server)
        .post(`/job-postings/${jobId}/application`)
        .set('Cookie', harness.cookie)
        .send({})
        .expect(201);

      const body = first.body as { applicationId: string; created: boolean };
      expect(body.created).toBe(true);
      expect(second.body).toEqual({
        applicationId: body.applicationId,
        created: false,
      });

      const applications = await harness.dataSource
        .getRepository(Application)
        .find();
      expect(applications).toHaveLength(1);
      expect(applications[0]).toMatchObject({
        position: 'Backend Engineer',
        url: `${BOARD_A}/1`,
        status: 'WISHLIST',
      });

      const tracked = await getAs<PaginatedJobPostings>(
        harness,
        '/job-postings?tracked=true',
      );
      expect(tracked.data.map((job) => job.id)).toEqual([jobId]);
      expect(tracked.data[0].applicationId).toBe(body.applicationId);
    });

    it('marks the offer applied when the application is created as applied', async () => {
      await request(harness.server)
        .post(`/job-postings/${jobId}/application`)
        .set('Cookie', harness.cookie)
        .send({ status: 'APPLIED' })
        .expect(201);

      const job = await getAs<JobPostingResponse>(
        harness,
        `/job-postings/${jobId}`,
      );
      expect(job.status).toBe('APPLIED');
    });

    it('404s on an offer that does not exist', async () => {
      const missing = '00000000-0000-0000-0000-000000000000';
      await request(harness.server)
        .patch(`/job-postings/${missing}/status`)
        .set('Cookie', harness.cookie)
        .send({ status: 'SEEN' })
        .expect(404);
      await request(harness.server)
        .post(`/job-postings/${missing}/application`)
        .set('Cookie', harness.cookie)
        .send({})
        .expect(404);
    });
  });
});
