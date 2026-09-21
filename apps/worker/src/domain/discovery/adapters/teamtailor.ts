import type { AtsAdapter, AtsTarget, DiscoveredJob } from '../types';
import { asString, joinLocation, strings, target } from './shared';

interface TeamtailorItem {
  id?: string;
  title?: string;
  url?: string;
  date_published?: string;
  content_html?: string;
  _jobposting?: {
    identifier?: { value?: string | number };
    employmentType?: string;
    validThrough?: string;
    jobLocation?: Array<{
      address?: {
        addressLocality?: string | null;
        addressRegion?: string | null;
        addressCountry?: string | null;
      };
    }>;
  };
}

interface TeamtailorFeed {
  items?: TeamtailorItem[];
}

const TOKEN_PATTERNS = [
  /([a-z0-9][a-z0-9-]*)\.teamtailor\.com/i,
  /teamtailor\.com\/widget\/[^"']*[?&]company=([a-z0-9-]+)/i,
];

const RESERVED = new Set(['www', 'app', 'api', 'assets', 'cdn', 'support']);

const MAX_PAGES = 20;

const tokenFrom = (text: string): string | null => {
  for (const pattern of TOKEN_PATTERNS) {
    const found = pattern.exec(text)?.[1]?.toLowerCase();
    if (found && !RESERVED.has(found)) return found;
  }
  return null;
};

export const teamtailorAdapter: AtsAdapter = {
  platform: 'teamtailor',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)teamtailor\.com$/i.test(url.hostname)) return null;
    const token = tokenFrom(url.toString());
    return token ? target('teamtailor', { token }) : null;
  },

  async fetch(atsTarget, ctx): Promise<DiscoveredJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];

    const base = `https://${token}.teamtailor.com/jobs.json`;
    const jobs: DiscoveredJob[] = [];
    // Only an empty page ends paging.
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const feed = await ctx.http.json<TeamtailorFeed>(
        page === 1 ? base : `${base}?page=${page}`,
      );
      const items = feed?.items;
      if (!items?.length) return jobs;

      let fresh = 0;
      for (const item of items) {
        const url = asString(item.url);
        const title = asString(item.title);
        if (!url || !title) continue;

        const posting = item._jobposting;
        const externalId =
          asString(item.id) ?? asString(posting?.identifier?.value);
        const key = externalId ?? url;
        if (seen.has(key)) continue;
        seen.add(key);
        fresh++;

        const markup = ctx.light
          ? undefined
          : asString(item.content_html ?? undefined);

        jobs.push({
          externalId,
          title,
          url,
          description: markup,
          descriptionHtml: markup,
          locations: strings(
            ...(posting?.jobLocation ?? []).map((place) =>
              joinLocation(
                place.address?.addressLocality ?? undefined,
                place.address?.addressCountry ?? undefined,
              ),
            ),
          ),
          employmentType: asString(posting?.employmentType),
          postedAt: asString(item.date_published),
          validThrough: asString(posting?.validThrough),
        });
      }

      if (!fresh) return jobs;

      if (page === MAX_PAGES) {
        ctx.markPartial?.(
          `teamtailor board ${token} still had offers after ${MAX_PAGES} pages`,
        );
      }
    }

    return jobs;
  },
};
