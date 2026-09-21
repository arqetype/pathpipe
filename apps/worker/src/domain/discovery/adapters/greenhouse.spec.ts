import type { DiscoveredJob } from '../types';
import { greenhouseAdapter } from './greenhouse';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('greenhouse adapter', () => {
  const listing = {
    jobs: [
      {
        id: 4012345,
        title: 'Backend Engineer',
        absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/4012345',
        first_published: '2024-04-01T10:00:00Z',
        updated_at: '2024-05-02T10:00:00Z',
        content: '&lt;p&gt;Build the platform&lt;/p&gt;',
        location: { name: 'Paris, France' },
        offices: [{ name: 'Paris' }, { name: 'Remote - EU' }],
        departments: [{ name: 'Engineering' }, { name: 'Platform' }],
      },
    ],
  };

  it('maps a posting, decoding the entity-encoded description once', async () => {
    const http = fakeHttp({
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true':
        listing,
    });

    const jobs = await greenhouseAdapter.fetch(
      { platform: 'greenhouse', params: { token: 'acme' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: '4012345',
        title: 'Backend Engineer',
        url: 'https://job-boards.greenhouse.io/acme/jobs/4012345',
        description: '<p>Build the platform</p>',
        descriptionHtml: '<p>Build the platform</p>',
        locations: ['Paris, France', 'Paris', 'Remote - EU'],
        department: 'Engineering',
        postedAt: '2024-04-01T10:00:00Z',
      },
    ]);
  });

  it('asks for the listing without descriptions in light mode', async () => {
    const http = fakeHttp({
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs': {
        jobs: [{ ...listing.jobs[0], content: undefined }],
      },
    });

    const jobs = await greenhouseAdapter.fetch(
      { platform: 'greenhouse', params: { token: 'acme' } },
      context(http, { light: true }),
    );

    expect(urlsOf(http)).toEqual([
      'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
    ]);
    expect(jobs[0]?.description).toBeUndefined();
  });

  it('returns nothing when the board is unknown or the token missing', async () => {
    expect(
      await greenhouseAdapter.fetch(
        { platform: 'greenhouse', params: {} },
        context(fakeHttp({})),
      ),
    ).toEqual([]);
    expect(
      await greenhouseAdapter.fetch(
        { platform: 'greenhouse', params: { token: 'nope' } },
        context(fakeHttp({})),
      ),
    ).toEqual([]);
  });
});
