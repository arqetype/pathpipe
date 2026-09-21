import type { AtsAdapter, AtsTarget, DiscoveredJob } from '../types';
import { asString, firstMatch, strings, target } from './shared';
import { decodeEntities } from '@repo/db/parsing/sanitize';

interface GreenhouseJob {
  id: number | string;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  content?: string;
  location?: { name?: string };
  offices?: Array<{ name?: string }>;
  departments?: Array<{ name?: string }>;
  metadata?: Array<{ name?: string; value?: unknown }>;
}

const TOKEN_PATTERNS = [
  /boards\.greenhouse\.io\/embed\/job_board\?(?:[^"'&]*&)?for=([a-z0-9_-]+)/i,
  /(?:job-)?boards\.greenhouse\.io\/(?:embed\/job_board\/js\?for=)?([a-z0-9_-]+)/i,
  /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i,
  /grnhse\.io\/([a-z0-9_-]+)/i,
  /Grnhse\.Settings\s*=\s*{[^}]*board["']?\s*:\s*["']([a-z0-9_-]+)/i,
];

const RESERVED = new Set(['embed', 'job_board', 'js', 'v1', 'boards']);

export const greenhouseAdapter: AtsAdapter = {
  platform: 'greenhouse',

  match(url: URL): AtsTarget | null {
    if (!/(^|\.)(greenhouse\.io|grnhse\.io)$/i.test(url.hostname)) return null;
    const fromQuery = url.searchParams.get('for');
    if (fromQuery) return target('greenhouse', { token: fromQuery });
    const token = firstMatch(url.toString(), TOKEN_PATTERNS);
    if (!token || RESERVED.has(token)) return null;
    return target('greenhouse', { token });
  },

  async fetch(atsTarget, ctx): Promise<DiscoveredJob[]> {
    const token = atsTarget.params['token'];
    if (!token) return [];

    const payload = await ctx.http.json<{ jobs?: GreenhouseJob[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs${ctx.light ? '' : '?content=true'}`,
    );
    if (!payload?.jobs) return [];

    return payload.jobs.map((job) => {
      // Greenhouse entity-encodes its markup.
      const content = asString(job.content);
      const markup = content ? decodeEntities(content) : undefined;
      return {
        externalId: String(job.id),
        title: job.title,
        url: job.absolute_url,
        description: markup,
        descriptionHtml: markup,
        locations: strings(
          job.location?.name,
          ...(job.offices ?? []).map((office) => office.name),
        ),
        department: job.departments?.[0]?.name,
        postedAt: job.first_published ?? job.updated_at,
      };
    });
  },
};
