import type { AtsAdapter, AtsTarget, ScrapedJob } from '../types';
import { asString, firstMatch, target } from './shared';

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
  descriptionPlain?: string;
  description?: string;
  categories?: {
    location?: string;
    allLocations?: string[];
    team?: string;
    department?: string;
    commitment?: string;
  };
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

const TOKEN_PATTERNS = [
  /jobs\.(?:eu\.)?lever\.co\/([a-z0-9._-]+)/i,
  /api\.(?:eu\.)?lever\.co\/v0\/postings\/([a-z0-9._-]+)/i,
];

const RESERVED = new Set(['v0', 'postings']);

/** Lever boards. `mode=json` on the public postings endpoint returns everything. */
const WORKPLACE_TYPES: Record<string, string | undefined> = {
  remote: 'REMOTE',
  hybrid: 'HYBRID',
  onsite: 'ON_SITE',
  'on-site': 'ON_SITE',
  unspecified: undefined,
};

export const leverAdapter: AtsAdapter = {
  platform: 'lever',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)lever\.co$/i.test(url.hostname)) return null;
    const token = firstMatch(url.toString(), TOKEN_PATTERNS);
    if (!token || RESERVED.has(token)) return null;
    return target('lever', {
      token,
      region: /\.eu\.lever\.co/i.test(url.hostname) ? 'eu' : undefined,
    });
  },

  detectInHtml(html: string): AtsTarget | null {
    const token = firstMatch(html, TOKEN_PATTERNS);
    if (!token || RESERVED.has(token)) return null;
    return target('lever', {
      token,
      region: /\.eu\.lever\.co/i.test(html) ? 'eu' : undefined,
    });
  },

  async fetch(atsTarget, ctx): Promise<ScrapedJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];
    const host =
      atsTarget.params['region'] === 'eu' ? 'api.eu.lever.co' : 'api.lever.co';

    const postings = await ctx.http.json<LeverPosting[]>(
      `https://${host}/v0/postings/${encodeURIComponent(token)}?mode=json`,
    );
    if (!Array.isArray(postings)) return [];

    return postings
      .filter((posting) => posting.hostedUrl ?? posting.applyUrl)
      .map((posting) => ({
        externalId: posting.id,
        title: posting.text,
        url: (posting.hostedUrl ?? posting.applyUrl) as string,
        description: asString(posting.descriptionPlain ?? posting.description),
        descriptionHtml: asString(posting.description),
        locations: [
          posting.categories?.location,
          ...(posting.categories?.allLocations ?? []),
        ].filter((value): value is string => Boolean(value)),
        department: posting.categories?.team ?? posting.categories?.department,
        employmentType: posting.categories?.commitment,
        remote: /remote/i.test(posting.workplaceType ?? ''),
        // Lever states the work model outright, which beats inferring it.
        remoteType:
          WORKPLACE_TYPES[(posting.workplaceType ?? '').toLowerCase()],
        salaryMin: posting.salaryRange?.min,
        salaryMax: posting.salaryRange?.max,
        salaryCurrency: posting.salaryRange?.currency,
        postedAt: posting.createdAt
          ? new Date(posting.createdAt).toISOString()
          : undefined,
      }));
  },
};
