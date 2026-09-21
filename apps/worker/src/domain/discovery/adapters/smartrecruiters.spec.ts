import type { DiscoveredJob } from '../types';
import { smartRecruitersAdapter } from './smartrecruiters';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('smartrecruiters adapter', () => {
  const posting = (id: string) => ({
    id,
    name: `Engineer ${id}`,
    releasedDate: '2024-03-01T00:00:00.000Z',
    company: { identifier: 'AcmeInc' },
    location: {
      city: 'Paris',
      region: 'Ile-de-France',
      country: 'fr',
      remote: false,
    },
    department: { label: 'Engineering' },
    typeOfEmployment: { label: 'Permanent' },
  });

  it('builds the offer URL from the company identifier and the posting id', async () => {
    const http = fakeHttp({
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=100&offset=0':
        { totalFound: 1, content: [posting('123')] },
    });

    const jobs = await smartRecruitersAdapter.fetch(
      { platform: 'smartrecruiters', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: '123',
        title: 'Engineer 123',
        url: 'https://jobs.smartrecruiters.com/AcmeInc/123',
        locations: ['Paris, Ile-de-France, FR'],
        department: 'Engineering',
        employmentType: 'Permanent',
        remote: false,
        postedAt: '2024-03-01T00:00:00.000Z',
      },
    ]);
  });

  it('pages 100 at a time and stops on the first short page', async () => {
    const full = Array.from({ length: 100 }, (_, i) => posting(`p1-${i}`));
    const http = fakeHttp({
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=100&offset=0':
        { content: full },
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=100&offset=100':
        { content: [posting('p2-0')] },
    });

    const jobs = await smartRecruitersAdapter.fetch(
      { platform: 'smartrecruiters', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs).toHaveLength(101);
    expect(urlsOf(http)).toHaveLength(2);
  });

  it('stops on an empty page', async () => {
    const http = fakeHttp({
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=100&offset=0':
        { content: [] },
    });

    expect(
      await smartRecruitersAdapter.fetch(
        { platform: 'smartrecruiters', params: { token: 'acme' } },
        context(http),
      ),
    ).toEqual([]);
    expect(urlsOf(http)).toHaveLength(1);
  });

  it('never ships a description — the API does not carry one', async () => {
    const http = fakeHttp({
      'https://api.smartrecruiters.com/v1/companies/acme/postings?limit=100&offset=0':
        { content: [posting('123')] },
    });

    const jobs = await smartRecruitersAdapter.fetch(
      { platform: 'smartrecruiters', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs[0]?.description).toBeUndefined();
  });
});
