import type { DiscoveredJob } from '../types';
import { leverAdapter } from './lever';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('lever adapter', () => {
  const postings = [
    {
      id: 'a1b2c3',
      text: 'Data Engineer',
      hostedUrl: 'https://jobs.lever.co/acme/a1b2c3',
      applyUrl: 'https://jobs.lever.co/acme/a1b2c3/apply',
      createdAt: 1714550400000,
      workplaceType: 'hybrid',
      descriptionPlain: 'Build pipelines',
      description: '<p>Build pipelines</p>',
      categories: {
        location: 'Paris',
        allLocations: ['Paris', 'Berlin'],
        team: 'Data',
        department: 'Engineering',
        commitment: 'Full-time',
      },
      salaryRange: { min: 60000, max: 80000, currency: 'EUR' },
    },
    { id: 'nolink', text: 'Ghost role' },
  ];

  it('maps a posting, preferring hostedUrl and the team over the department', async () => {
    const http = fakeHttp({
      'https://api.lever.co/v0/postings/acme?mode=json': postings,
    });

    const jobs = await leverAdapter.fetch(
      { platform: 'lever', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: 'a1b2c3',
        title: 'Data Engineer',
        url: 'https://jobs.lever.co/acme/a1b2c3',
        description: 'Build pipelines',
        descriptionHtml: '<p>Build pipelines</p>',
        locations: ['Paris', 'Paris', 'Berlin'],
        department: 'Data',
        employmentType: 'Full-time',
        remote: false,
        remoteType: 'HYBRID',
        salaryMin: 60000,
        salaryMax: 80000,
        salaryCurrency: 'EUR',
        postedAt: '2024-05-01T08:00:00.000Z',
      },
    ]);
  });

  it('reads the EU region from its own host', async () => {
    const http = fakeHttp({
      'https://api.eu.lever.co/v0/postings/acme?mode=json': [],
    });

    await leverAdapter.fetch(
      { platform: 'lever', params: { token: 'acme', region: 'eu' } },
      context(http),
    );

    expect(urlsOf(http)).toEqual([
      'https://api.eu.lever.co/v0/postings/acme?mode=json',
    ]);
  });

  it('ignores light mode', async () => {
    const http = fakeHttp({
      'https://api.lever.co/v0/postings/acme?mode=json': postings,
    });

    const jobs = await leverAdapter.fetch(
      { platform: 'lever', params: { token: 'acme' } },
      context(http, { light: true }),
    );

    expect(jobs[0]?.description).toBe('Build pipelines');
  });
});
