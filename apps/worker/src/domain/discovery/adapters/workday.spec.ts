import type { DiscoveredJob } from '../types';
import { workdayAdapter } from './workday';
import { context, fakeHttp, urlsOf } from './fake-http';

describe('workday adapter', () => {
  const posting = (n: number) => ({
    title: `Engineer ${n}`,
    externalPath: `/job/Santa-Clara/Engineer_JR${n}`,
    locationsText: 'Santa Clara, CA',
    postedOn: 'Posted 3 Days Ago',
    startDate: '2024-07-01',
  });

  const endpoint =
    'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/External/jobs';

  it('POSTs the CXS search and maps a posting, keying it on the requisition id', async () => {
    const http = fakeHttp({
      [endpoint]: { total: 1, jobPostings: [posting(1)] },
    });

    const jobs = await workdayAdapter.fetch(
      {
        platform: 'workday',
        params: { tenant: 'nvidia', datacenter: 'wd5', site: 'External' },
      },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: 'JR1',
        title: 'Engineer 1',
        url: 'https://nvidia.wd5.myworkdayjobs.com/en-US/External/job/Santa-Clara/Engineer_JR1',
        location: 'Santa Clara, CA',
        postedAt: '2024-07-01',
      },
    ]);
    expect(http.calls[0]?.options).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 20,
        offset: 0,
        searchText: '',
      }),
    });
  });

  it('pages by however many postings came back, until the total is reached', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => posting(i));
    const page2 = [posting(100), posting(101)];
    const http = fakeHttp((_url, options) => {
      const offset = JSON.parse(options?.body ?? '{}').offset as number;
      return { total: 22, jobPostings: offset === 0 ? page1 : page2 };
    });

    const jobs = await workdayAdapter.fetch(
      {
        platform: 'workday',
        params: { tenant: 'nvidia', datacenter: 'wd5', site: 'External' },
      },
      context(http),
    );

    expect(jobs).toHaveLength(22);
    expect(urlsOf(http)).toHaveLength(2);
  });

  it('marks the listing partial when the 150-page cap is hit with more to come', async () => {
    const http = fakeHttp(() => ({
      total: 1_000_000,
      jobPostings: [posting(1)],
    }));
    const markPartial = jest.fn();

    const jobs = await workdayAdapter.fetch(
      {
        platform: 'workday',
        params: { tenant: 'nvidia', datacenter: 'wd5', site: 'External' },
      },
      context(http, { markPartial }),
    );

    expect(jobs).toHaveLength(150);
    expect(markPartial).toHaveBeenCalledWith(
      'workday board has 1000000 postings, read 150',
    );
  });

  it('drops a posting with no external path', async () => {
    const http = fakeHttp({
      [endpoint]: { total: 1, jobPostings: [{ title: 'Ghost' }] },
    });

    expect(
      await workdayAdapter.fetch(
        {
          platform: 'workday',
          params: { tenant: 'nvidia', datacenter: 'wd5', site: 'External' },
        },
        context(http),
      ),
    ).toEqual([]);
  });

  it('returns nothing when the coordinates are incomplete', async () => {
    expect(
      await workdayAdapter.fetch(
        { platform: 'workday', params: { tenant: 'nvidia' } },
        context(fakeHttp({})),
      ),
    ).toEqual([]);
  });
});
