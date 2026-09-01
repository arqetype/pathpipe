import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
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
const EMBED_PATTERN =
  /https?:\/\/([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([A-Za-z0-9_-]+)/;

// Tenants reject a larger page than this outright, so 20 it is; paging then
// advances by however many postings actually came back.
const PAGE_SIZE = 20;
/**
 * Enough for a 3000-posting board. Big tenants (NVIDIA, Salesforce) run past
 * 1500, and stopping early is not a cosmetic loss: reconciliation would read
 * the short listing as proof the rest were taken down.
 */
const MAX_PAGES = 150;

/**
 * Workday tenants. The CXS endpoint behind every Workday careers site accepts
 * an unauthenticated POST and pages 20 postings at a time.
 */
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

  detectInHtml(html: string): AtsTarget | null {
    const match = EMBED_PATTERN.exec(html);
    if (!match) return null;
    return target('workday', {
      tenant: match[1],
      datacenter: match[2],
      site: match[3],
    });
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const { tenant, datacenter, site } = atsTarget.params;
    if (!tenant || !datacenter || !site) return [];

    const host = `${tenant}.${datacenter}.myworkdayjobs.com`;
    const endpoint = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
    const jobs: ScrapedJob[] = [];
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

      // Last allowed page, and the tenant says there is more to come.
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
          // The requisition id is the last path segment after the final underscore.
          externalId: posting.externalPath.split('_').pop(),
          title: posting.title,
          url: `https://${host}/en-US/${site}${posting.externalPath}`,
          location: posting.locationsText,
          // Workday reports "Posted 3 Days Ago" rather than a date; keep the
          // absolute start date when present and let the DB fall back to null.
          postedAt: posting.startDate,
        });
      }

      offset += postings.length;
      if (payload?.total && offset >= payload.total) break;
    }

    return jobs;
  },
};
