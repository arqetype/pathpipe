import type { DiscoveredJob } from '../types';
import { normalizeJob, normalizeJobs } from './job';

const raw = (over: Partial<DiscoveredJob> = {}): DiscoveredJob => ({
  title: 'Senior Backend Engineer',
  url: 'https://jobs.example.com/1',
  ...over,
});

describe('normalizeJob', () => {
  it('rejects a job whose title is a navigation label', () => {
    expect(normalizeJob(raw({ title: 'Apply now' }))).toBeNull();
  });

  it('rejects a job whose URL is not http(s)', () => {
    expect(normalizeJob(raw({ url: 'mailto:jobs@example.com' }))).toBeNull();
  });

  it('normalises the URL and stringifies the external id', () => {
    const job = normalizeJob(
      raw({ externalId: 42 as unknown as string, url: 'http://www.x.com/a/' }),
    );
    expect(job?.url).toBe('https://x.com/a');
    expect(job?.externalId).toBe('42');
  });

  it('sanitises the markup and derives plain text from it', () => {
    const job = normalizeJob(
      raw({
        descriptionHtml:
          '<p onclick="x()">Build <b>things</b></p><script>e()</script>',
      }),
    );
    expect(job?.descriptionHtml).toBe('<p>Build <b>things</b></p>');
    expect(job?.description).toBe('Build things');
  });

  it('treats a description that carries tags as the markup too', () => {
    const job = normalizeJob(raw({ description: '<p>Build things</p>' }));
    expect(job?.descriptionHtml).toBe('<p>Build things</p>');
    expect(job?.description).toBe('Build things');
  });

  it('leaves a plain-text description as text, with no markup', () => {
    const job = normalizeJob(raw({ description: 'Build things' }));
    expect(job?.description).toBe('Build things');
    expect(job?.descriptionHtml).toBeUndefined();
  });

  it('parses every location the board named and builds one label from them', () => {
    const job = normalizeJob(
      raw({
        locations: ['Paris, France', 'Berlin'],
        location: 'Paris, France',
      }),
    );
    expect(job?.parsedLocations).toEqual([
      { city: 'Paris', region: null, country: 'FR', raw: 'Paris, France' },
      { city: 'Berlin', region: null, country: 'DE', raw: 'Berlin' },
    ]);
    expect(job?.location).toBe('Paris, FR · Berlin, DE');
  });

  it('classifies the domain and the seniority off the title', () => {
    const job = normalizeJob(raw({ title: 'Senior Backend Engineer' }));
    expect(job?.domain).toBe('BACKEND');
    expect(job?.seniority).toBe('SENIOR');
  });

  it('reads the salary out of the description when the board gave none', () => {
    const job = normalizeJob(
      raw({ description: 'We pay €45,000 - €55,000 per year.' }),
    );
    expect(job?.salaryMin).toBe(45000);
    expect(job?.salaryCurrency).toBe('EUR');
  });

  it('drops an hourly rate the board states as pay', () => {
    const job = normalizeJob(
      raw({ salaryMin: 62.98, salaryMax: 75.5, salaryCurrency: 'USD' }),
    );
    expect(job?.salaryMin).toBeUndefined();
    expect(job?.salaryMax).toBeUndefined();
  });

  it('keeps the board figures rather than reading the description', () => {
    const job = normalizeJob(
      raw({
        salaryMin: 90000,
        salaryMax: 110000,
        salaryCurrency: 'USD',
        description: 'Previously we paid €45,000 - €55,000.',
      }),
    );
    expect(job?.salaryMin).toBe(90000);
    expect(job?.salaryCurrency).toBe('USD');
  });

  it('lets a location the board labelled "Remote" outrank a guess', () => {
    const job = normalizeJob(
      raw({ locations: ['Remote'], title: 'On-site Chef' }),
    );
    expect(job?.remoteType).toBe('REMOTE');
  });

  it('drops a date outside the plausible window', () => {
    expect(
      normalizeJob(raw({ postedAt: '1998-01-01' }))?.postedAt,
    ).toBeUndefined();
    expect(
      normalizeJob(raw({ postedAt: 'not a date' }))?.postedAt,
    ).toBeUndefined();
  });

  it('reads a unix timestamp in seconds or in milliseconds', () => {
    expect(
      normalizeJob(raw({ postedAt: 1700000000 as unknown as string }))
        ?.postedAt,
    ).toBe('2023-11-14T22:13:20.000Z');
    expect(
      normalizeJob(raw({ postedAt: 1700000000000 as unknown as string }))
        ?.postedAt,
    ).toBe('2023-11-14T22:13:20.000Z');
  });
});

describe('normalizeJobs', () => {
  it('drops the jobs that do not normalise', () => {
    expect(
      normalizeJobs([raw(), raw({ title: 'Apply now' })], 'greenhouse'),
    ).toHaveLength(1);
  });

  it('dedupes on the job key, keeping the richest of the duplicates', () => {
    const thin = raw({ externalId: '1', url: 'https://jobs.example.com/1' });
    const rich = raw({
      externalId: '1',
      url: 'https://jobs.example.com/1?utm_source=x',
      description: 'Build things',
      location: 'Paris, France',
      department: 'Engineering',
      postedAt: '2024-05-01T00:00:00.000Z',
    });

    const [kept, ...rest] = normalizeJobs([thin, rich], 'greenhouse');

    expect(rest).toHaveLength(0);
    expect(kept?.description).toBe('Build things');
    expect(kept?.department).toBe('Engineering');
  });

  it('keeps the first of two equally rich duplicates', () => {
    const first = raw({ externalId: '1', title: 'Backend Engineer' });
    const second = raw({ externalId: '1', title: 'Backend Developer' });
    expect(normalizeJobs([first, second], 'lever')[0]?.title).toBe(
      'Backend Engineer',
    );
  });

  it('does not merge two postings that only share a URL prefix', () => {
    expect(
      normalizeJobs(
        [
          raw({ url: 'https://jobs.example.com/1' }),
          raw({ url: 'https://jobs.example.com/2' }),
        ],
        null,
      ),
    ).toHaveLength(2);
  });
});
