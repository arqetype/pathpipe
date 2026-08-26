import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
import { asString, firstMatch, joinLocation, target } from './shared';

interface AshbyJob {
  id: string;
  title: string;
  jobUrl?: string;
  applyUrl?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  department?: string;
  team?: string;
  employmentType?: string;
  isRemote?: boolean;
  publishedAt?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: {
    compensationTierSummary?: string;
    summaryComponents?: Array<{
      minValue?: number;
      maxValue?: number;
      currencyCode?: string;
      compensationType?: string;
    }>;
  };
}

const TOKEN_PATTERNS = [
  /jobs\.ashbyhq\.com\/([a-z0-9._-]+)/i,
  /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9._-]+)/i,
  /ashbyhq\.com\/embed\?[^"']*jobBoardName=([a-z0-9._-]+)/i,
];

/** Ashby boards. The posting API is public and needs no key. */
export const ashbyAdapter: AtsAdapter = {
  platform: 'ashby',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)ashbyhq\.com$/i.test(url.hostname)) return null;
    const token = firstMatch(url.toString(), TOKEN_PATTERNS);
    return token ? target('ashby', { token }) : null;
  },

  detectInHtml(html: string): AtsTarget | null {
    const token = firstMatch(html, TOKEN_PATTERNS);
    return token ? target('ashby', { token }) : null;
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];

    const payload = await ctx.http.json<{ jobs?: AshbyJob[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}${ctx.light ? '' : '?includeCompensation=true'}`,
    );
    if (!payload?.jobs) return [];

    return payload.jobs
      .filter((job) => job.jobUrl ?? job.applyUrl)
      .map((job) => {
        const salary = job.compensation?.summaryComponents?.find(
          (component) => component.minValue || component.maxValue,
        );
        return {
          externalId: job.id,
          title: job.title,
          url: (job.jobUrl ?? job.applyUrl) as string,
          description: asString(job.descriptionPlain ?? job.descriptionHtml),
          location: joinLocation(
            job.location,
            ...(job.secondaryLocations ?? []).map((entry) => entry.location),
          ),
          department: job.department ?? job.team,
          employmentType: job.employmentType,
          remote: job.isRemote,
          salaryMin: salary?.minValue,
          salaryMax: salary?.maxValue,
          salaryCurrency: salary?.currencyCode,
          postedAt: job.publishedAt,
        };
      });
  },
};
