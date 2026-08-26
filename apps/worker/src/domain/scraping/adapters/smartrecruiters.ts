import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
import { firstMatch, joinLocation, target } from './shared';

interface SmartRecruitersPosting {
  id: string;
  uuid?: string;
  name: string;
  ref?: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string };
  typeOfEmployment?: { label?: string };
  customField?: Array<{ fieldLabel?: string; valueLabel?: string }>;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const TOKEN_PATTERNS = [
  /(?:careers|jobs)\.smartrecruiters\.com\/([A-Za-z0-9._-]+)/i,
  /api\.smartrecruiters\.com\/v1\/companies\/([A-Za-z0-9._-]+)/i,
  /smartrecruiters\.com\/embed[^"']*company=([A-Za-z0-9._-]+)/i,
];

/** SmartRecruiters postings API, paged 100 at a time. */
export const smartRecruitersAdapter: AtsAdapter = {
  platform: 'smartrecruiters',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)smartrecruiters\.com$/i.test(url.hostname)) return null;
    const token = firstMatch(url.toString(), TOKEN_PATTERNS);
    return token ? target('smartrecruiters', { token }) : null;
  },

  detectInHtml(html: string): AtsTarget | null {
    const token = firstMatch(html, TOKEN_PATTERNS);
    return token ? target('smartrecruiters', { token }) : null;
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];

    const jobs: ScrapedJob[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const payload = await ctx.http.json<{
        totalFound?: number;
        content?: SmartRecruitersPosting[];
      }>(
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      );
      const content = payload?.content;
      if (!content?.length) break;

      for (const posting of content) {
        const identifier = posting.company?.identifier ?? token;
        jobs.push({
          externalId: posting.id ?? posting.uuid,
          title: posting.name,
          url: `https://jobs.smartrecruiters.com/${identifier}/${posting.id}`,
          location: joinLocation(
            posting.location?.city,
            posting.location?.region,
            posting.location?.country?.toUpperCase(),
          ),
          department: posting.department?.label,
          employmentType: posting.typeOfEmployment?.label,
          remote: posting.location?.remote,
          postedAt: posting.releasedDate,
        });
      }

      if (content.length < PAGE_SIZE) break;
    }

    return jobs;
  },
};
