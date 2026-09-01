import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
import { asString, joinLocation, target } from './shared';

/**
 * Teamtailor publishes each board as a JSON Feed at `/jobs.json`, with the
 * schema.org JobPosting for every item inlined under `_jobposting`.
 */
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

/**
 * Hostnames under teamtailor.com that are the product, not a customer board.
 */
const RESERVED = new Set(['www', 'app', 'api', 'assets', 'cdn', 'support']);

/** The feed pages, and a page is never bigger than this. */
const MAX_PAGES = 20;

const tokenFrom = (text: string): string | null => {
  for (const pattern of TOKEN_PATTERNS) {
    const found = pattern.exec(text)?.[1]?.toLowerCase();
    if (found && !RESERVED.has(found)) return found;
  }
  return null;
};

/**
 * Teamtailor boards (Stockholm; most used by Nordic and European employers).
 *
 * The feed is public and needs no key. It carries the full description inline,
 * so an offer is complete after one request — no per-posting fetch.
 */
export const teamtailorAdapter: AtsAdapter = {
  platform: 'teamtailor',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)teamtailor\.com$/i.test(url.hostname)) return null;
    const token = tokenFrom(url.toString());
    return token ? target('teamtailor', { token }) : null;
  },

  detectInHtml(html: string): AtsTarget | null {
    const token = tokenFrom(html);
    return token ? target('teamtailor', { token }) : null;
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];

    const base = `https://${token}.teamtailor.com/jobs.json`;
    const jobs: ScrapedJob[] = [];
    // The feed does not say how many pages there are, and a page repeats
    // nothing, so the only end signal is an empty page. Ids are tracked anyway:
    // a board that answered page 2 with page 1 would otherwise loop to the cap
    // and store every offer twice.
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
          locations: (posting?.jobLocation ?? [])
            .map((place) =>
              // The region is a sales territory on these boards ("EMEA"), which
              // is not a place a location filter can resolve, so it is dropped.
              joinLocation(
                place.address?.addressLocality ?? undefined,
                place.address?.addressCountry ?? undefined,
              ),
            )
            .filter((value): value is string => Boolean(value)),
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
