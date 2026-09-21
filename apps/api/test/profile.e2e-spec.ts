import request from 'supertest';

import type {
  JobPreferenceResponse,
  ResumeProfileApplied,
} from '@repo/db/query/job-preference';

import { createHarness, getAs, type Harness } from './harness';

/** What LinkedIn's own "Save to PDF" yields once the text is extracted. */
const CV = `
Jane Doe
Senior Data Engineer at Northwind
Berlin, Germany

Experience
Northwind
Senior Data Engineer
January 2021 - Present
Berlin, Germany

Skills
Python
Apache Spark
`;

describe('/job-preferences', () => {
  let harness: Harness;

  const put = (body: string | object, status = 200) =>
    request(harness.server)
      .put('/job-preferences')
      .set('Cookie', harness.cookie)
      .send(body)
      .expect(status);

  const profile = () =>
    getAs<JobPreferenceResponse>(harness, '/job-preferences');

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  it('answers with an empty profile for a user who has none', async () => {
    expect(await profile()).toEqual({
      employmentTypes: [],
      remoteTypes: [],
      countries: [],
      cities: [],
      openToRelocation: false,
      domains: [],
      seniorities: [],
      industries: [],
      motivations: [],
      keywords: [],
      titles: [],
      requiredKeywords: [],
      resumeText: null,
      resumeKeywords: [],
      resumeUpdatedAt: null,
      excludedKeywords: [],
      excludedCompanies: [],
      minSalary: null,
      salaryCurrency: null,
      maxAgeDays: null,
      weights: {},
      notifyMatches: true,
      configured: false,
      completeness: 0,
    });
  });

  it('normalises what it stores and reports how complete the profile is', async () => {
    const saved = await put({
      countries: ['fr', 'be'],
      cities: ['  Paris  ', 'Paris', 'Lyon'],
      domains: ['BACKEND', 'BACKEND'],
      keywords: [' postgres ', 'postgres'],
      salaryCurrency: 'eur',
      minSalary: 50000,
      weights: { DOMAIN: 'ESSENTIAL' },
    });

    const body = saved.body as JobPreferenceResponse;
    expect(body).toMatchObject({
      countries: ['FR', 'BE'],
      cities: ['Paris', 'Lyon'],
      domains: ['BACKEND'],
      keywords: ['postgres'],
      salaryCurrency: 'EUR',
      minSalary: 50000,
      weights: { DOMAIN: 'ESSENTIAL' },
      configured: true,
    });
    // Four of the fourteen signals the scorer reads are filled in.
    expect(body.completeness).toBe(29);

    // A field left out of the body is a field left alone.
    const after = (await put({ minSalary: 60000 }))
      .body as JobPreferenceResponse;
    expect(after.cities).toEqual(['Paris', 'Lyon']);
    expect(after.minSalary).toBe(60000);
  });

  it('refuses a body the DTO does not describe', async () => {
    await put({ domains: ['ASTROLOGY'] }, 400);
    await put({ countries: ['FRA'] }, 400);
    await put({ weights: { DOMAIN: 'VERY_IMPORTANT' } }, 400);
    await put({ notAField: true }, 400);
  });

  it('derives the CV keywords on every save of the text', async () => {
    const body = (await put({ resumeText: CV })).body as JobPreferenceResponse;

    expect(body.resumeText).toContain('Senior Data Engineer');
    expect(body.resumeKeywords).toEqual(
      expect.arrayContaining(['python', 'spark']),
    );
    expect(body.resumeUpdatedAt).not.toBeNull();

    const cleared = (await put({ resumeText: '' }))
      .body as JobPreferenceResponse;
    expect(cleared.resumeText).toBeNull();
    expect(cleared.resumeKeywords).toEqual([]);
    expect(cleared.resumeUpdatedAt).toBeNull();
  });

  describe('POST /job-preferences/resume/apply', () => {
    const apply = (status = 200) =>
      request(harness.server)
        .post('/job-preferences/resume/apply')
        .set('Cookie', harness.cookie)
        .expect(status);

    it('asks for a CV first', async () => {
      await apply(400);
    });

    it('fills only the fields the user left empty', async () => {
      await put({ resumeText: CV });

      const applied = (await apply()).body as ResumeProfileApplied;

      expect(applied.filled).toEqual(
        expect.arrayContaining(['titles', 'domains', 'seniority']),
      );
      expect(applied.skipped).toEqual([]);
      expect(applied.preference.titles).toContain('Senior Data Engineer');
      expect(applied.preference.domains).toContain('DATA');
      expect(applied.preference.seniorities).toContain('SENIOR');
      expect(applied.preference.cities).toContain('Berlin');
      expect(applied.preference.countries).toContain('DE');
      // Skills are never copied into `keywords`: they already weigh in
      // through `resumeKeywords`.
      expect(applied.preference.keywords).toEqual([]);
    });

    it('reports, rather than overwrites, an answer the user already gave', async () => {
      await put({
        resumeText: CV,
        titles: ['Staff Engineer'],
        cities: ['Paris'],
      });

      const applied = (await apply()).body as ResumeProfileApplied;

      expect(applied.skipped).toEqual(
        expect.arrayContaining(['titles', 'cities']),
      );
      expect(applied.filled).not.toContain('titles');
      expect(applied.preference.titles).toEqual(['Staff Engineer']);
      expect(applied.preference.cities).toEqual(['Paris']);
    });

    it('changes nothing on a second run', async () => {
      await put({ resumeText: CV });
      const first = (await apply()).body as ResumeProfileApplied;
      const second = (await apply()).body as ResumeProfileApplied;

      expect(second.filled).toEqual([]);
      expect(second.skipped).toEqual(first.filled);
      expect(second.preference.titles).toEqual(first.preference.titles);
    });
  });
});
