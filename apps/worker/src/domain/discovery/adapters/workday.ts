import type { AtsAdapter, AtsTarget, DiscoveredJob } from '../types';
import { target } from './shared';

interface WorkdayPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  startDate?: string;
}

const HOST_PATTERN = /^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/i;
const PAGE_SIZE = 20;
// Stopping early closes live postings.
const MAX_PAGES = 150;

export const workdayAdapter: AtsAdapter = {
  platform: 'workday',

  match(url: URL): AtsTarget | null {
    const host = HOST_PATTERN.exec(url.hostname);
    if (!host) return null;
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .filter((segment) => !/^[a-z]{2}-[A-Z]{2}$/.test(segment));
    const site = segments[0];
    if (!site) return null;
    return target('workday', {
      tenant: host[1],
      datacenter: host[2],
      site,
    });
  },

  async fetch(atsTarget, ctx): Promise<DiscoveredJob[]> {
    const { tenant, datacenter, site } = atsTarget.params;
    if (!tenant || !datacenter || !site) return [];

    const host = `${tenant}.${datacenter}.myworkdayjobs.com`;
    const endpoint = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
    const jobs: DiscoveredJob[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const payload = await ctx.http.json<{
        total?: number;
        jobPostings?: WorkdayPosting[];
      }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appliedFacets: {},
          limit: PAGE_SIZE,
          offset,
          searchText: '',
        }),
      });

      const postings = payload?.jobPostings;
      if (!postings?.length) break;

      if (
        page === MAX_PAGES - 1 &&
        (payload.total ?? 0) > offset + postings.length
      ) {
        ctx.markPartial?.(
          `workday board has ${payload.total} postings, read ${offset + postings.length}`,
        );
      }

      for (const posting of postings) {
        if (!posting.externalPath) continue;
        jobs.push({
          externalId: posting.externalPath.split('_').pop(),
          title: posting.title,
          url: `https://${host}/en-US/${site}${posting.externalPath}`,
          location: posting.locationsText,
          postedAt: posting.startDate,
        });
      }

      offset += postings.length;
      if (payload?.total && offset >= payload.total) break;
    }

    return jobs;
  },
};
