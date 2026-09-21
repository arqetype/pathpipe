import request from 'supertest';

import type { PaginatedJobPostings } from '@repo/db/query/job-posting';
import { CompanyIndustry } from '@repo/db/types/company/industry';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '@repo/db/types/job-posting/work-domain';
import {
  MatchCriterion,
  MatchImportance,
  type MatchWeights,
} from '@repo/db/types/job-preference/importance';

import {
  createHarness,
  getAs,
  seedCompany,
  seedJob,
  type Harness,
} from './harness';

/**
 * The match score, to the integer.
 *
 * The profile below names seven criteria and nothing that ranks on text, so
 * every number here is hand-computable from `match/score.ts`:
 *
 *   domain 40 · seniority 20 · employment type 35 · location (city) 30 ·
 *   title 35 · salary 10 · industry 15  =  185 points available
 *
 * A criterion the *offer* says nothing about leaves both sides of the ratio,
 * which is what the two "not penalised" tests below pin down.
 */
describe('match scoring', () => {
  let harness: Harness;
  const id: Record<string, string> = {};

  const setProfile = (weights: MatchWeights = {}) =>
    request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send({
        domains: [WorkDomain.BACKEND],
        seniorities: [SeniorityLevel.SENIOR],
        employmentTypes: [EmploymentType.FULL_TIME],
        cities: ['Paris'],
        countries: ['FR'],
        titles: ['backend engineer'],
        industries: [CompanyIndustry.SOFTWARE],
        minSalary: 50000,
        salaryCurrency: 'EUR',
        openToRelocation: false,
        weights,
      })
      .expect(200);

  const scores = async (query = ''): Promise<Record<string, number | null>> => {
    const page = await getAs<PaginatedJobPostings>(
      harness,
      `/job-postings?limit=100${query}`,
    );
    return Object.fromEntries(
      page.data.map((job) => [job.title, job.matchScore]),
    );
  };

  beforeAll(async () => {
    harness = await createHarness();
    await harness.reset();

    const software = await seedCompany(
      harness,
      'Acme',
      CompanyIndustry.SOFTWARE,
    );
    const unknownIndustry = await seedCompany(harness, 'Mystery Corp');

    // Everything the profile asks for: 185 of 185.
    id.perfect = (
      await seedJob(harness, {
        companyId: software.id,
        title: 'Senior Backend Engineer',
        url: 'https://acme.example.com/perfect',
        domain: WorkDomain.BACKEND,
        seniority: SeniorityLevel.SENIOR,
        employmentType: EmploymentType.FULL_TIME,
        remoteType: RemoteType.HYBRID,
        places: [{ city: 'Paris', country: 'FR' }],
        salaryMin: 60000,
        salaryMax: 80000,
        salaryCurrency: 'EUR',
        postedAt: new Date('2026-03-01T00:00:00Z'),
      })
    ).id;

    // The same fit, but the board published neither a salary nor an industry:
    // both criteria drop out, so 160 of 160.
    id.silent = (
      await seedJob(harness, {
        companyId: unknownIndustry.id,
        title: 'Senior Backend Engineer (F/H)',
        url: 'https://mystery.example.com/silent',
        domain: WorkDomain.BACKEND,
        seniority: SeniorityLevel.SENIOR,
        employmentType: EmploymentType.FULL_TIME,
        places: [{ city: 'Paris', country: 'FR' }],
        postedAt: new Date('2026-02-20T00:00:00Z'),
      })
    ).id;

    // Right country, right industry, nothing else — and no seniority and no
    // salary, which cost it nothing: 35 of 155.
    id.partial = (
      await seedJob(harness, {
        companyId: software.id,
        title: 'Frontend Developer',
        url: 'https://acme.example.com/partial',
        domain: WorkDomain.FRONTEND,
        employmentType: EmploymentType.INTERNSHIP,
        places: [{ city: 'Lyon', country: 'FR' }],
        postedAt: new Date('2026-02-10T00:00:00Z'),
      })
    ).id;

    // Nothing in common, and the company's industry is unknown: 0 of 160.
    id.unrelated = (
      await seedJob(harness, {
        companyId: unknownIndustry.id,
        title: 'Account Executive',
        url: 'https://mystery.example.com/unrelated',
        domain: WorkDomain.SALES,
        seniority: SeniorityLevel.INTERN,
        employmentType: EmploymentType.CONTRACT,
        remoteType: RemoteType.ON_SITE,
        places: [{ city: 'Berlin', country: 'DE' }],
        postedAt: new Date('2026-02-01T00:00:00Z'),
      })
    ).id;

    // Everything but the title: 150 of 185.
    id.untitled = (
      await seedJob(harness, {
        companyId: software.id,
        title: 'Platform Craftsperson',
        url: 'https://acme.example.com/untitled',
        domain: WorkDomain.BACKEND,
        seniority: SeniorityLevel.SENIOR,
        employmentType: EmploymentType.FULL_TIME,
        places: [{ city: 'Paris', country: 'FR' }],
        salaryMin: 70000,
        salaryCurrency: 'EUR',
        postedAt: new Date('2026-01-20T00:00:00Z'),
      })
    ).id;
  });

  afterAll(async () => {
    await harness.close();
  });

  it('scores nothing at all without a profile', async () => {
    const page = await getAs<PaginatedJobPostings>(harness, '/job-postings');
    expect(page.hasProfile).toBe(false);
    expect(page.data.every((job) => job.matchScore === null)).toBe(true);
  });

  it('scores a near-perfect, a partial and an unrelated offer exactly', async () => {
    await setProfile();

    expect(await scores()).toEqual({
      'Senior Backend Engineer': 100,
      'Senior Backend Engineer (F/H)': 100,
      'Platform Craftsperson': 81,
      'Frontend Developer': 23,
      'Account Executive': 0,
    });
  });

  it('does not penalise an offer that publishes no salary and no industry', async () => {
    await setProfile();
    const board = await scores();

    // Same fit as the fully-described offer, same score: the two criteria the
    // board is silent about leave the points and the per-row maximum together.
    expect(board['Senior Backend Engineer (F/H)']).toBe(
      board['Senior Backend Engineer'],
    );
  });

  it('drops an ignored criterion from the points and from the maximum', async () => {
    await setProfile({ [MatchCriterion.TITLE]: MatchImportance.IGNORED });

    const board = await scores();
    // 150 of 185 becomes 150 of 150 once the title stops counting.
    expect(board['Platform Craftsperson']).toBe(100);
    expect(board['Senior Backend Engineer']).toBe(100);
    // The partial fit keeps its 35 points but is now measured out of 120.
    expect(board['Frontend Developer']).toBe(29);
  });

  it('doubles an essential criterion on both sides of the ratio', async () => {
    await setProfile({ [MatchCriterion.DOMAIN]: MatchImportance.ESSENTIAL });

    const board = await scores();
    // 190 of 225.
    expect(board['Platform Craftsperson']).toBe(84);
    // 35 of 195 — the domain it misses is now worth 80.
    expect(board['Frontend Developer']).toBe(18);
  });

  it('ranks by score by default and bands on the same expression', async () => {
    await setProfile();

    const page = await getAs<PaginatedJobPostings>(harness, '/job-postings');
    expect(page.hasProfile).toBe(true);
    expect(page.data.map((job) => job.id)).toEqual([
      id.perfect,
      id.silent,
      id.untitled,
      id.partial,
      id.unrelated,
    ]);

    const strong = await getAs<PaginatedJobPostings>(
      harness,
      '/job-postings?minScore=90',
    );
    expect(strong.data.map((job) => job.id)).toEqual([id.perfect, id.silent]);

    const weak = await getAs<PaginatedJobPostings>(
      harness,
      '/job-postings?maxScore=30',
    );
    expect(weak.data.map((job) => job.id)).toEqual([id.partial, id.unrelated]);
  });

  it('hides nothing by default, and only hides on onlyMatches', async () => {
    await setProfile();

    expect(
      (await getAs<PaginatedJobPostings>(harness, '/job-postings')).total,
    ).toBe(5);
    // The requirements the toggle applies are the structured ones: the
    // unrelated offer fails domain, seniority, contract and location.
    const only = await getAs<PaginatedJobPostings>(
      harness,
      '/job-postings?onlyMatches=true',
    );
    expect(only.data.map((job) => job.id)).toEqual([
      id.perfect,
      id.silent,
      id.untitled,
    ]);
  });

  it('excludes what the profile says never to show', async () => {
    await request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send({ excludedKeywords: ['executive'] })
      .expect(200);

    const page = await getAs<PaginatedJobPostings>(harness, '/job-postings');
    expect(page.data.map((job) => job.id)).not.toContain(id.unrelated);

    await request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send({ excludedKeywords: [] })
      .expect(200);
  });
});
