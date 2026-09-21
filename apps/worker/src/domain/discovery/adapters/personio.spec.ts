import type { DiscoveredJob } from '../types';
import { personioAdapter } from './personio';
import { context, fakeHttp, urlsOf } from './fake-http';

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
        department: 'Sales & Growth',
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
