import type { DiscoveredJob } from '../types';
import { teamtailorAdapter } from './teamtailor';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('teamtailor adapter', () => {
  const item = (id: string) => ({
    id,
    title: `Engineer ${id}`,
    url: `https://polestar.teamtailor.com/jobs/${id}`,
    date_published: '2024-02-01T00:00:00Z',
    content_html: `<p>Role ${id}</p>`,
    _jobposting: {
      identifier: { value: id },
      employmentType: 'FULL_TIME',
      validThrough: '2024-12-31T00:00:00Z',
      jobLocation: [
        {
          address: {
            addressLocality: 'Gothenburg',
            addressRegion: 'EMEA',
            addressCountry: 'Sweden',
          },
        },
      ],
    },
  });

  it('maps a feed item, dropping the sales region from the location', async () => {
    const http = fakeHttp({
      'https://polestar.teamtailor.com/jobs.json': { items: [item('1')] },
      'https://polestar.teamtailor.com/jobs.json?page=2': { items: [] },
    });

    const jobs = await teamtailorAdapter.fetch(
      { platform: 'teamtailor', params: { token: 'polestar' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: '1',
        title: 'Engineer 1',
        url: 'https://polestar.teamtailor.com/jobs/1',
        description: '<p>Role 1</p>',
        descriptionHtml: '<p>Role 1</p>',
        locations: ['Gothenburg, Sweden'],
        employmentType: 'FULL_TIME',
        postedAt: '2024-02-01T00:00:00Z',
        validThrough: '2024-12-31T00:00:00Z',
      },
    ]);
  });

  it('reads pages until one comes back empty', async () => {
    const http = fakeHttp({
      'https://polestar.teamtailor.com/jobs.json': { items: [item('1')] },
      'https://polestar.teamtailor.com/jobs.json?page=2': {
        items: [item('2')],
      },
      'https://polestar.teamtailor.com/jobs.json?page=3': { items: [] },
    });

    const jobs = await teamtailorAdapter.fetch(
      { platform: 'teamtailor', params: { token: 'polestar' } },
      context(http),
    );

    expect(jobs.map((job) => job.externalId)).toEqual(['1', '2']);
    expect(urlsOf(http)).toHaveLength(3);
  });

  it('stops when a page repeats what the previous one already gave', async () => {
    const http = fakeHttp(() => ({ items: [item('1')] }));

    const jobs = await teamtailorAdapter.fetch(
      { platform: 'teamtailor', params: { token: 'polestar' } },
      context(http),
    );

    expect(jobs).toHaveLength(1);
    expect(urlsOf(http)).toHaveLength(2);
  });

  it('marks the listing partial when 20 pages of fresh offers were not enough', async () => {
    let page = 0;
    const http = fakeHttp(() => ({ items: [item(String(++page))] }));
    const markPartial = jest.fn();

    const jobs = await teamtailorAdapter.fetch(
      { platform: 'teamtailor', params: { token: 'polestar' } },
      context(http, { markPartial }),
    );

    expect(jobs).toHaveLength(20);
    expect(markPartial).toHaveBeenCalledWith(
      'teamtailor board polestar still had offers after 20 pages',
    );
  });

  it('skips the description in light mode', async () => {
    const http = fakeHttp({
      'https://polestar.teamtailor.com/jobs.json': { items: [item('1')] },
      'https://polestar.teamtailor.com/jobs.json?page=2': { items: [] },
    });

    const jobs = await teamtailorAdapter.fetch(
      { platform: 'teamtailor', params: { token: 'polestar' } },
      context(http, { light: true }),
    );

    expect(jobs[0]?.description).toBeUndefined();
    expect(jobs[0]?.descriptionHtml).toBeUndefined();
    expect(jobs[0]?.title).toBe('Engineer 1');
  });

  it('drops an item with no url or no title', async () => {
    const http = fakeHttp({
      'https://polestar.teamtailor.com/jobs.json': {
        items: [
          { id: '1', title: 'No url' },
          { id: '2', url: 'https://x/2' },
        ],
      },
      'https://polestar.teamtailor.com/jobs.json?page=2': { items: [] },
    });

    expect(
      await teamtailorAdapter.fetch(
        { platform: 'teamtailor', params: { token: 'polestar' } },
        context(http),
      ),
    ).toEqual([]);
  });
});
