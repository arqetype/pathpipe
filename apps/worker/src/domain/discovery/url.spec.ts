import {
  fingerprintJobs,
  jobKey,
  normalizeUrl,
  registrableDomain,
} from './url';
import type { DiscoveredJob } from './types';

const job = (over: Partial<DiscoveredJob> = {}): DiscoveredJob => ({
  title: 'Engineer',
  url: 'https://jobs.example.com/1',
  ...over,
});

describe('normalizeUrl', () => {
  it('upgrades http to https, drops www, the hash and the trailing slash', () => {
    expect(normalizeUrl('http://www.Example.com/careers/#apply')).toBe(
      'https://example.com/careers',
    );
  });

  it('drops the default port for the scheme', () => {
    expect(normalizeUrl('https://example.com:443/jobs')).toBe(
      'https://example.com/jobs',
    );
  });

  it('keeps a non-default port', () => {
    expect(normalizeUrl('https://example.com:8443/jobs')).toBe(
      'https://example.com:8443/jobs',
    );
  });

  it('removes tracking parameters and sorts what is left', () => {
    expect(
      normalizeUrl(
        'https://example.com/j?utm_source=x&gh_src=y&b=2&a=1&lever-source=z',
      ),
    ).toBe('https://example.com/j?a=1&b=2');
  });

  it('returns the trimmed input when it is not a URL', () => {
    expect(normalizeUrl('  not a url  ')).toBe('not a url');
  });

  it('makes two links to the same posting identical', () => {
    expect(
      normalizeUrl('http://WWW.jobs.example.com/a/1/?utm_medium=mail'),
    ).toBe(normalizeUrl('https://jobs.example.com/a/1#top'));
  });
});

describe('registrableDomain', () => {
  it.each([
    ['https://acme.jobs.personio.de/xml', 'personio.de'],
    ['https://other.jobs.personio.de/xml', 'personio.de'],
    ['https://polestar.teamtailor.com/jobs.json', 'teamtailor.com'],
    ['https://careers.example.co.uk/jobs', 'example.co.uk'],
    ['https://10.0.0.1/jobs', '10.0.0.1'],
    ['localhost', 'localhost'],
  ])('%s belongs to %s', (url, expected) => {
    expect(registrableDomain(url)).toBe(expected);
  });
});

describe('jobKey', () => {
  it('prefers the ATS id, namespaced by platform', () => {
    expect(jobKey(job({ externalId: '42' }), 'greenhouse')).toBe(
      'greenhouse:42',
    );
  });

  it('falls back to "ats" when no platform is given', () => {
    expect(jobKey(job({ externalId: '42' }))).toBe('ats:42');
  });

  it('falls back to the normalised URL with no id', () => {
    expect(jobKey(job({ url: 'http://www.jobs.example.com/1/' }))).toBe(
      'https://jobs.example.com/1',
    );
  });
});

describe('fingerprintJobs', () => {
  it('is stable under reordering — the whole change detection rests on it', () => {
    const a = job({ externalId: '1' });
    const b = job({ externalId: '2', url: 'https://jobs.example.com/2' });
    expect(fingerprintJobs([a, b], 'lever')).toBe(
      fingerprintJobs([b, a], 'lever'),
    );
  });

  it('changes when a job joins the set', () => {
    const a = job({ externalId: '1' });
    const b = job({ externalId: '2', url: 'https://jobs.example.com/2' });
    expect(fingerprintJobs([a], 'lever')).not.toBe(
      fingerprintJobs([a, b], 'lever'),
    );
  });

  it('ignores everything but the key — a retitled posting hashes the same', () => {
    expect(fingerprintJobs([job({ externalId: '1', title: 'A' })], 'x')).toBe(
      fingerprintJobs([job({ externalId: '1', title: 'B' })], 'x'),
    );
  });

  it('is namespaced by platform', () => {
    expect(fingerprintJobs([job({ externalId: '1' })], 'lever')).not.toBe(
      fingerprintJobs([job({ externalId: '1' })], 'ashby'),
    );
  });
});
