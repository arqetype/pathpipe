import type { DiscoveredJob } from '../types';
import { ashbyAdapter } from './ashby';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('ashby adapter', () => {
  const listing = {
    jobs: [
      {
        id: 'uuid-1',
        title: 'Product Designer',
        jobUrl: 'https://jobs.ashbyhq.com/acme/uuid-1',
        location: 'Remote',
        secondaryLocations: [{ location: 'Lisbon' }],
        department: 'Design',
        team: 'Core',
        employmentType: 'FullTime',
        isRemote: true,
        publishedAt: '2024-06-01T00:00:00Z',
        descriptionPlain: 'Design things',
        descriptionHtml: '<p>Design things</p>',
        compensation: {
          summaryComponents: [
            { compensationType: 'Equity' },
            { minValue: 100000, maxValue: 130000, currencyCode: 'USD' },
          ],
        },
      },
    ],
  };

  it('maps a posting and takes the first compensation component with a figure', async () => {
    const http = fakeHttp({
      'https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true':
        listing,
    });

    const jobs = await ashbyAdapter.fetch(
      { platform: 'ashby', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: 'uuid-1',
        title: 'Product Designer',
        url: 'https://jobs.ashbyhq.com/acme/uuid-1',
        description: 'Design things',
        descriptionHtml: '<p>Design things</p>',
        locations: ['Remote', 'Lisbon'],
        department: 'Design',
        employmentType: 'FullTime',
        remote: true,
        salaryMin: 100000,
        salaryMax: 130000,
        salaryCurrency: 'USD',
        postedAt: '2024-06-01T00:00:00Z',
      },
    ]);
  });

  it('drops the compensation query in light mode', async () => {
    const http = fakeHttp({
      'https://api.ashbyhq.com/posting-api/job-board/acme': { jobs: [] },
    });

    await ashbyAdapter.fetch(
      { platform: 'ashby', params: { token: 'acme' } },
      context(http, { light: true }),
    );

    expect(urlsOf(http)).toEqual([
      'https://api.ashbyhq.com/posting-api/job-board/acme',
    ]);
  });
});
