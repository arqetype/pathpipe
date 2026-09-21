import request from 'supertest';

import { Application } from '@repo/db/entities/application';
import type { DashboardResponse } from '@repo/db/query/dashboard';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';

import {
  createHarness,
  getAs,
  seedCompany,
  seedJob,
  type Harness,
} from './harness';

const DAY_MS = 86_400_000;
const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

/** `GET /dashboard` — the home page, and the counts it derives. */
describe('GET /dashboard', () => {
  let harness: Harness;

  const dashboard = () => getAs<DashboardResponse>(harness, '/dashboard');

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  const application = (
    position: string,
    status: ApplicationStatus,
    appliedAt: Date | null = null,
  ) =>
    harness.dataSource.getRepository(Application).save({
      position,
      status,
      appliedAt: appliedAt ?? undefined,
      user: harness.user,
    });

  it('answers with an empty board for a user who has done nothing', async () => {
    const body = await dashboard();

    expect(body).toEqual({
      stats: {
        wishlist: 0,
        applied: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
        ghosted: 0,
        totalApplications: 0,
        staleApplied: 0,
        appliedThisWeek: 0,
        appliedLastWeek: 0,
        responseRate: null,
        strongMatches: 0,
        savedUndecided: 0,
        hasProfile: false,
        profileCompleteness: 0,
      },
      topMatches: [],
      savedOffers: [],
      wishlistApplications: [],
      staleApplications: [],
    });
  });

  it('counts the application pipeline, the sending rhythm and the reply rate', async () => {
    await application('Wishlist role', ApplicationStatus.WISHLIST);
    await application('Sent this week', ApplicationStatus.APPLIED, daysAgo(2));
    await application('Sent last week', ApplicationStatus.APPLIED, daysAgo(10));
    await application('Gone quiet', ApplicationStatus.APPLIED, daysAgo(30));
    await application('Interviewing', ApplicationStatus.INTERVIEW, daysAgo(20));
    await application('Turned down', ApplicationStatus.REJECTED, daysAgo(25));

    const { stats, wishlistApplications, staleApplications } =
      await dashboard();

    expect(stats).toMatchObject({
      wishlist: 1,
      applied: 3,
      interview: 1,
      offer: 0,
      rejected: 1,
      ghosted: 0,
      totalApplications: 6,
      // Sent, still APPLIED and quiet for more than a fortnight.
      staleApplied: 1,
      appliedThisWeek: 1,
      appliedLastWeek: 1,
      // Two of the five sent applications drew a reply.
      responseRate: 40,
    });

    expect(wishlistApplications.map((row) => row.position)).toEqual([
      'Wishlist role',
    ]);
    expect(staleApplications.map((row) => row.position)).toEqual([
      'Gone quiet',
    ]);
    expect(staleApplications[0].daysSince).toBe(30);
  });

  it('lists the strong matches and the saved offers once a profile exists', async () => {
    const acme = await seedCompany(harness, 'Acme', CompanyIndustry.SOFTWARE);
    const strong = await seedJob(harness, {
      companyId: acme.id,
      title: 'Senior Backend Engineer',
      url: 'https://acme.example.com/1',
      domain: WorkDomain.BACKEND,
      seniority: SeniorityLevel.SENIOR,
      employmentType: EmploymentType.FULL_TIME,
      places: [{ city: 'Paris', country: 'FR' }],
    });
    const weak = await seedJob(harness, {
      companyId: acme.id,
      title: 'Account Executive',
      url: 'https://acme.example.com/2',
      domain: WorkDomain.SALES,
      seniority: SeniorityLevel.INTERN,
      employmentType: EmploymentType.CONTRACT,
      places: [{ city: 'Berlin', country: 'DE' }],
    });

    await request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send({
        domains: [WorkDomain.BACKEND],
        seniorities: [SeniorityLevel.SENIOR],
        employmentTypes: [EmploymentType.FULL_TIME],
        cities: ['Paris'],
      })
      .expect(200);

    // Bookmarking the weak offer is what puts it on the "still undecided" list.
    await request(harness.server)
      .patch(`/job-postings/${weak.id}/saved`)
      .set('Cookie', harness.cookie)
      .send({ saved: true })
      .expect(200);

    const { stats, topMatches, savedOffers } = await dashboard();

    expect(topMatches.map((job) => job.id)).toEqual([strong.id]);
    expect(topMatches[0].matchScore).toBe(100);
    expect(stats.strongMatches).toBe(1);
    expect(savedOffers.map((job) => job.id)).toEqual([weak.id]);
    expect(stats.savedUndecided).toBe(1);
    expect(stats.hasProfile).toBe(true);
    // Four of the fourteen signals the scorer reads.
    expect(stats.profileCompleteness).toBe(29);
  });

  it('drops an offer off the strong matches once it is tracked', async () => {
    const acme = await seedCompany(harness, 'Acme', CompanyIndustry.SOFTWARE);
    const strong = await seedJob(harness, {
      companyId: acme.id,
      title: 'Senior Backend Engineer',
      url: 'https://acme.example.com/1',
      domain: WorkDomain.BACKEND,
      places: [{ city: 'Paris', country: 'FR' }],
    });
    await request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send({ domains: [WorkDomain.BACKEND], cities: ['Paris'] })
      .expect(200);

    expect((await dashboard()).stats.strongMatches).toBe(1);

    await request(harness.server)
      .post(`/job-postings/${strong.id}/application`)
      .set('Cookie', harness.cookie)
      .send({})
      .expect(201);

    const after = await dashboard();
    expect(after.stats.strongMatches).toBe(0);
    expect(after.topMatches).toEqual([]);
  });
});
