import type {
  AdapterContext,
  HttpRequestOptions,
  HttpResponse,
  DiscoveredJob,
} from '../types';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';
import { smartRecruitersAdapter } from './smartrecruiters';
import { teamtailorAdapter } from './teamtailor';
import { personioAdapter } from './personio';
import { workdayAdapter } from './workday';

/**
 * A fetcher that answers from a table of canned bodies, and records what was
 * asked for. Nothing here touches the network.
 */
const fakeHttp = (
  bodies:
    | Record<string, unknown>
    | ((url: string, options?: HttpRequestOptions) => unknown),
) => {
  const calls: Array<{ url: string; options?: HttpRequestOptions }> = [];
  const lookup = (url: string, options?: HttpRequestOptions): unknown =>
    typeof bodies === 'function' ? bodies(url, options) : bodies[url];

  return {
    calls,
    request: (
      url: string,
      options?: HttpRequestOptions,
    ): Promise<HttpResponse> => {
      calls.push({ url, options });
      const body = lookup(url, options);
      return Promise.resolve({
        status: body === undefined ? 404 : 200,
        ok: body !== undefined,
        url,
        body: typeof body === 'string' ? body : JSON.stringify(body ?? ''),
        retryAfter: null,
      });
    },
    json: <T>(url: string, options?: HttpRequestOptions): Promise<T | null> => {
      calls.push({ url, options });
      return Promise.resolve((lookup(url, options) ?? null) as T | null);
    },
  };
};

const context = (
  http: ReturnType<typeof fakeHttp>,
  over: Partial<AdapterContext> = {},
): AdapterContext => ({ http, log: () => {}, ...over });

const urlsOf = (http: ReturnType<typeof fakeHttp>): string[] =>
  http.calls.map((call) => call.url);

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
    // No link at all: dropped, because there is nothing to send a user to.
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

  // Lever ships everything in one response, so there is no cheap listing to
  // ask for: light mode fetches exactly the same document.
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

describe('personio adapter', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workzag-jobs>
  <position>
    <id>1234567</id>
    <name>Kundenberater (m/w/d)</name>
    <office>Berlin</office>
    <additionalOffices>
      <office>M&#252;nchen</office>
    </additionalOffices>
    <recruitingCategory>002_Sales &amp; Growth</recruitingCategory>
    <employmentType>permanent</employmentType>
    <schedule>part-time</schedule>
    <createdAt>2024-01-15T09:00:00+01:00</createdAt>
    <jobDescriptions>
      <jobDescription>
        <name><![CDATA[Your tasks]]></name>
        <value><![CDATA[<p>Talk to customers</p>]]></value>
      </jobDescription>
      <jobDescription>
        <name><![CDATA[About us]]></name>
        <value><![CDATA[<p>We sell tills</p>]]></value>
      </jobDescription>
    </jobDescriptions>
  </position>
  <position>
    <name>No id here</name>
  </position>
</workzag-jobs>`;

  it('reads a position out of the XML feed and rebuilds its URL', async () => {
    const http = fakeHttp({ 'https://orderbird.jobs.personio.de/xml': xml });

    const jobs = await personioAdapter.fetch(
      { platform: 'personio', params: { token: 'orderbird', tld: 'de' } },
      context(http),
    );

    expect(jobs).toEqual<DiscoveredJob[]>([
      {
        externalId: '1234567',
        title: 'Kundenberater (m/w/d)',
        url: 'https://orderbird.jobs.personio.de/job/1234567',
        description:
          '<h3>Your tasks</h3><p>Talk to customers</p>\n<h3>About us</h3><p>We sell tills</p>',
        descriptionHtml:
          '<h3>Your tasks</h3><p>Talk to customers</p>\n<h3>About us</h3><p>We sell tills</p>',
        locations: ['Berlin', 'München'],
        // No <department>, so the display category is used with its ordering
        // prefix stripped.
        department: 'Sales & Growth',
        // Contract then schedule, so the normaliser sees the more specific one.
        employmentType: 'permanent part-time',
        postedAt: '2024-01-15T09:00:00+01:00',
      },
    ]);
  });

  it('prefers the org chart department over the display category', async () => {
    const http = fakeHttp({
      'https://orderbird.jobs.personio.de/xml': xml.replace(
        '<recruitingCategory>',
        '<department>Customer Success</department><recruitingCategory>',
      ),
    });

    const jobs = await personioAdapter.fetch(
      { platform: 'personio', params: { token: 'orderbird' } },
      context(http),
    );

    expect(jobs[0]?.department).toBe('Customer Success');
  });

  it('defaults to the .de tld', async () => {
    const http = fakeHttp({ 'https://orderbird.jobs.personio.de/xml': xml });

    await personioAdapter.fetch(
      { platform: 'personio', params: { token: 'orderbird' } },
      context(http),
    );

    expect(urlsOf(http)).toEqual(['https://orderbird.jobs.personio.de/xml']);
  });

  it('skips the descriptions in light mode', async () => {
    const http = fakeHttp({ 'https://orderbird.jobs.personio.de/xml': xml });

    const jobs = await personioAdapter.fetch(
      { platform: 'personio', params: { token: 'orderbird' } },
      context(http, { light: true }),
    );

    expect(jobs[0]?.descriptionHtml).toBeUndefined();
    expect(jobs[0]?.title).toBe('Kundenberater (m/w/d)');
  });

  it('returns nothing when the feed does not answer', async () => {
    expect(
      await personioAdapter.fetch(
        { platform: 'personio', params: { token: 'gone' } },
        context(fakeHttp({})),
      ),
    ).toEqual([]);
  });
});

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
