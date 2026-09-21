import {
  cleanLocation,
  cleanTitle,
  isPlausibleTitle,
  isRemote,
  normalizeEmploymentType,
  normalizeJob,
  normalizeJobs,
  normalizeRemoteType,
  parseSalary,
  stripHtml,
} from './normalize';
import type { DiscoveredJob } from './types';

const raw = (over: Partial<DiscoveredJob> = {}): DiscoveredJob => ({
  title: 'Senior Backend Engineer',
  url: 'https://jobs.example.com/1',
  ...over,
});

describe('cleanTitle', () => {
  it.each([
    ['  Senior   Backend   Engineer ', 'Senior Backend Engineer'],
    ['- Backend Engineer •', 'Backend Engineer'],
    ['Backend Engineer NEW', 'Backend Engineer'],
    ['Backend Engineer new!', 'Backend Engineer'],
    ['Backend Engineer (3)', 'Backend Engineer'],
    ['D&#233;veloppeur Backend', 'Développeur Backend'],
  ])('%j becomes %j', (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });
});

describe('isPlausibleTitle', () => {
  it.each([
    'Senior Backend Engineer',
    'Head of Product',
    'Développeur Fullstack (H/F)',
  ])('accepts %j', (title) => {
    expect(isPlausibleTitle(title)).toBe(true);
  });

  it.each([
    ['too short', 'QA'],
    ['no letters', '12345'],
    ['a nav label, matched exactly', 'Apply now'],
    ['an accented nav label, folded', 'Mentions légales'],
    ['a short nav-prefixed label', 'View all jobs'],
    ['a sentence of copy', 'We are looking for a great engineer to join us.'],
    ['a verb boards use for links', 'Share this job with a friend'],
  ])('rejects %s: %j', (_reason, title) => {
    expect(isPlausibleTitle(title)).toBe(false);
  });

  it('accepts a nav-prefixed title once it is long enough (5+ words)', () => {
    expect(isPlausibleTitle('Search Quality Engineer, Ads Platform')).toBe(
      true,
    );
  });
});

describe('stripHtml', () => {
  it('drops script and style content entirely', () => {
    expect(
      stripHtml('<p>Keep</p><script>evil()</script><style>a{}</style>'),
    ).toBe('Keep');
  });

  it('turns block ends into newlines and decodes entities', () => {
    expect(stripHtml('<p>One</p><p>Two &amp; three</p>')).toBe(
      'One\nTwo & three',
    );
  });

  it('turns <br> into a newline', () => {
    expect(stripHtml('a<br>b<br/>c')).toBe('a\nb\nc');
  });

  it('collapses a run of empty paragraphs to one blank line', () => {
    expect(stripHtml('<p>a</p><p></p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
  });
});

describe('parseSalary', () => {
  it('reads a euro range written with thousand separators', () => {
    expect(parseSalary('Salary: €45,000 - €55,000 per year')).toEqual({
      salaryMin: 45000,
      salaryMax: 55000,
      salaryCurrency: 'EUR',
    });
  });

  it('expands the k suffix', () => {
    expect(parseSalary('$120k–$150k')).toEqual({
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: 'USD',
    });
  });

  it('takes the currency from either side of the range', () => {
    expect(parseSalary('between 45.000 and 55.000 £').salaryCurrency).toBe(
      undefined,
    );
    expect(parseSalary('45 000 to £55 000').salaryCurrency).toBe('GBP');
  });

  it.each([
    ['no range at all', 'Competitive salary'],
    ['an inverted range', '$150k - $120k'],
    ['numbers far too small to be pay', '2 - 5 years of experience'],
    ['nothing to read', undefined],
  ])('returns nothing for %s', (_reason, text) => {
    expect(parseSalary(text)).toEqual({});
  });

  it('leaves the currency undefined when no symbol is written', () => {
    expect(parseSalary('45,000 - 55,000')).toEqual({
      salaryMin: 45000,
      salaryMax: 55000,
      salaryCurrency: undefined,
    });
  });
});

describe('isRemote', () => {
  it('reads any of the values given', () => {
    expect(isRemote(undefined, 'Paris, télétravail')).toBe(true);
    expect(isRemote('Work from home')).toBe(true);
    expect(isRemote('Paris', 'Full-time')).toBe(false);
  });
});

describe('cleanLocation', () => {
  it('collapses whitespace and strips edge punctuation', () => {
    expect(cleanLocation(' - Paris,  France • ')).toBe('Paris, France');
  });

  it('drops a field label a board left in its own slot', () => {
    expect(cleanLocation('Location')).toBeUndefined();
  });

  it('drops anything longer than 120 characters', () => {
    expect(cleanLocation('x'.repeat(121))).toBeUndefined();
  });
});

describe('normalizeEmploymentType', () => {
  it.each([
    ['Full-time', 'FULL_TIME'],
    ['CDI', 'FULL_TIME'],
    ['Part time', 'PART_TIME'],
    ['Stage', 'INTERNSHIP'],
    ['Alternance', 'APPRENTICESHIP'],
    ['Freelance', 'FREELANCE'],
    ['CDD', 'TEMPORARY'],
    ['Contract', 'CONTRACT'],
    ['Service civique', 'VOLUNTEER'],
  ])('folds %j into %s', (input, expected) => {
    expect(normalizeEmploymentType(input)).toBe(expected);
  });

  it('folds accents before matching', () => {
    expect(normalizeEmploymentType('Stagiaîre')).toBe('INTERNSHIP');
  });

  it('is ordered by specificity: a full-time internship is an internship', () => {
    expect(normalizeEmploymentType('Full-time internship')).toBe('INTERNSHIP');
  });

  it('takes the first value that says anything', () => {
    expect(
      normalizeEmploymentType(undefined, 'nothing here', 'Part-time', 'CDI'),
    ).toBe('PART_TIME');
  });

  it('returns nothing when no value names a contract', () => {
    expect(normalizeEmploymentType('Engineering', null)).toBeUndefined();
  });
});

describe('normalizeRemoteType', () => {
  it('reads hybrid first, however the board worded it', () => {
    expect(normalizeRemoteType(true, 'Hybrid remote')).toBe('HYBRID');
    expect(normalizeRemoteType(undefined, '2 days a week in the office')).toBe(
      'HYBRID',
    );
  });

  it('reads an explicit fully-remote wording', () => {
    expect(normalizeRemoteType(undefined, '100% remote')).toBe('REMOTE');
  });

  it('trusts the flag once no wording decided it', () => {
    expect(normalizeRemoteType(true, 'Paris')).toBe('REMOTE');
  });

  it('reads on-site wording when the flag is not set', () => {
    expect(normalizeRemoteType(undefined, 'On-site in Berlin')).toBe('ON_SITE');
  });

  it('falls back to a bare "remote" anywhere in the text', () => {
    expect(normalizeRemoteType(false, 'Paris (Remote friendly)')).toBe(
      // "remote-friendly" is matched by the hybrid pattern first.
      'HYBRID',
    );
    expect(normalizeRemoteType(false, 'Remote, France')).toBe('REMOTE');
  });

  it('returns nothing when no signal says anything', () => {
    expect(normalizeRemoteType(undefined, 'Paris')).toBeUndefined();
  });

  // Documents today's behaviour: `flag === false` is not "not remote", it only
  // fails to force REMOTE, so on-site wording still wins over it.
  it('treats a false flag as no signal rather than as on-site', () => {
    expect(normalizeRemoteType(false, 'Paris office')).toBeUndefined();
  });
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
