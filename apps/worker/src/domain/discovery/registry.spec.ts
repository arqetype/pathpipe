import { ADAPTERS, matchAdapterByUrl } from './registry';

describe('matchAdapterByUrl', () => {
  it.each([
    ['https://job-boards.greenhouse.io/acme', 'greenhouse', { token: 'acme' }],
    [
      'https://boards.greenhouse.io/embed/job_board?for=acme',
      'greenhouse',
      { token: 'acme' },
    ],
    ['https://grnhse.io/acme', 'greenhouse', { token: 'acme' }],
    ['https://jobs.lever.co/acme', 'lever', { token: 'acme' }],
    ['https://jobs.eu.lever.co/acme', 'lever', { token: 'acme', region: 'eu' }],
    ['https://jobs.ashbyhq.com/acme', 'ashby', { token: 'acme' }],
    [
      'https://careers.smartrecruiters.com/Acme',
      'smartrecruiters',
      { token: 'Acme' },
    ],
    [
      'https://polestar.teamtailor.com/jobs',
      'teamtailor',
      { token: 'polestar' },
    ],
    [
      'https://orderbird.jobs.personio.de/',
      'personio',
      { token: 'orderbird', tld: 'de' },
    ],
    [
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite',
      'workday',
      { tenant: 'nvidia', datacenter: 'wd5', site: 'NVIDIAExternalCareerSite' },
    ],
  ])('claims %s for %s', (url, platform, params) => {
    const match = matchAdapterByUrl(url);
    expect(match?.adapter.platform).toBe(platform);
    expect(match?.target.params).toEqual(params);
  });

  it.each([
    ['a URL on no known vendor', 'https://careers.example.com/jobs'],
    ['a vendor page that names no board', 'https://www.teamtailor.com/'],
    [
      'a reserved Greenhouse path segment',
      'https://boards.greenhouse.io/embed',
    ],
    [
      'a Workday host with no site path',
      'https://nvidia.wd5.myworkdayjobs.com/',
    ],
    ['something that is not a URL at all', 'not a url'],
    // Today's behaviour: the token patterns all want the board name in the
    // path, so a per-customer Greenhouse subdomain carries no readable token.
    [
      'a Greenhouse embed subdomain with an empty path',
      'https://acme.grnhse.io/',
    ],
  ])('claims nothing for %s', (_reason, url) => {
    expect(matchAdapterByUrl(url)).toBeNull();
  });

  it('gives the more specific pattern the first look: Greenhouse before Lever and Ashby', () => {
    const platforms = ADAPTERS.map((adapter) => adapter.platform);
    expect(platforms).toEqual([
      'greenhouse',
      'lever',
      'ashby',
      'smartrecruiters',
      'teamtailor',
      'personio',
      'workday',
    ]);
  });

  it('stops at the first adapter that claims the URL', () => {
    // Every adapter gates on the hostname first, so only one can ever answer —
    // this pins that the sweep does not fall through to a later, looser one.
    const claimants = ADAPTERS.filter((adapter) =>
      adapter.match(new URL('https://jobs.ashbyhq.com/acme')),
    ).map((adapter) => adapter.platform);
    expect(claimants).toEqual(['ashby']);
  });
});
