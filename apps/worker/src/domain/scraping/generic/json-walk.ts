import type { ScrapedJob } from '../types';
import { resolveUrl } from '../url';
import { isPlausibleTitle } from '../normalize';

/**
 * Field names, in priority order, that carry each piece of a job across the
 * dozens of in-house APIs we cannot write adapters for.
 */
const TITLE_KEYS = [
  'title',
  'jobTitle',
  'job_title',
  'name',
  'position',
  'positionName',
  'positionTitle',
  'text',
  'label',
  'headline',
  'intitule',
  'titre',
  'jobOpeningName',
  'displayTitle',
];

const URL_KEYS = [
  'url',
  'jobUrl',
  'job_url',
  'absolute_url',
  'absoluteUrl',
  'applyUrl',
  'apply_url',
  'hostedUrl',
  'careers_url',
  'link',
  'permalink',
  'href',
  'canonicalUrl',
  'externalPath',
  'path',
  'slug',
  'shortcode',
];

const ID_KEYS = [
  'id',
  'uuid',
  'jobId',
  'job_id',
  'requisitionId',
  'reqId',
  'externalId',
  'shortcode',
  'eId',
  'gh_id',
  'postingId',
];

const LOCATION_KEYS = [
  'location',
  'locationName',
  'locations',
  'locationsText',
  'city',
  'office',
  'offices',
  'officeLocation',
  'officeLocations',
  'workLocation',
  'workplace',
  'place',
  'jobLocation',
  'lieu',
  'ville',
  'primaryLocation',
  'region',
  'country',
  'address',
  'geo',
  'site',
  'campus',
];

const DEPARTMENT_KEYS = [
  'department',
  'departmentName',
  'team',
  'category',
  'function',
  'businessUnit',
];

const DATE_KEYS = [
  'postedAt',
  'posted_at',
  'publishedAt',
  'published_at',
  'published_on',
  'createdAt',
  'created_at',
  'datePosted',
  'firstPublished',
  'first_published',
  'releasedDate',
  'live_date',
  'updated_at',
];

const DESCRIPTION_KEYS = [
  'description',
  'descriptionPlain',
  'descriptionHtml',
  'content',
  'jobDescription',
  'body',
  'summary',
  'requirements',
];

type Row = Record<string, unknown>;

const pick = (row: Row, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  // Case-insensitive second pass — APIs disagree on casing.
  const lowered = new Map(
    Object.keys(row).map((key) => [key.toLowerCase(), key] as const),
  );
  for (const key of keys) {
    const actual = lowered.get(key.toLowerCase());
    if (actual) {
      const value = row[actual];
      if (value !== undefined && value !== null && value !== '') return value;
    }
  }
  return undefined;
};

const flattenText = (value: unknown, depth = 0): string | undefined => {
  if (depth > 3 || value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => flattenText(entry, depth + 1))
      .filter((part): part is string => Boolean(part));
    return parts.length ? [...new Set(parts)].join(', ') : undefined;
  }
  if (typeof value === 'object') {
    const row = value as Row;
    for (const key of ['name', 'label', 'text', 'title', 'city', 'value']) {
      const nested = flattenText(row[key], depth + 1);
      if (nested) return nested;
    }
  }
  return undefined;
};

/** Does this object look like a job record? */
const scoreRow = (row: Row): number => {
  const title = flattenText(pick(row, TITLE_KEYS));
  if (!title || !isPlausibleTitle(title)) return 0;

  let score = 2;
  if (pick(row, URL_KEYS)) score += 2;
  if (pick(row, ID_KEYS)) score += 1;
  if (pick(row, LOCATION_KEYS)) score += 1;
  if (pick(row, DATE_KEYS)) score += 1;
  if (pick(row, DEPARTMENT_KEYS)) score += 1;
  return score;
};

const rowToJob = (row: Row, baseUrl: string): ScrapedJob | null => {
  const title = flattenText(pick(row, TITLE_KEYS));
  if (!title) return null;

  const rawUrl = flattenText(pick(row, URL_KEYS));
  const url = rawUrl ? resolveUrl(rawUrl, baseUrl) : null;
  if (!url) return null;

  return {
    externalId: flattenText(pick(row, ID_KEYS)),
    title,
    url,
    description: flattenText(pick(row, DESCRIPTION_KEYS)),
    location: flattenText(pick(row, LOCATION_KEYS)),
    department: flattenText(pick(row, DEPARTMENT_KEYS)),
    employmentType: flattenText(
      pick(row, [
        'employmentType',
        'employment_type',
        'contractType',
        'commitment',
        'type',
      ]),
    ),
    postedAt: flattenText(pick(row, DATE_KEYS)),
  };
};

interface Candidate {
  jobs: ScrapedJob[];
  score: number;
}

/**
 * Walks an arbitrary JSON value looking for the array of job records inside it.
 *
 * This is what makes the pipeline platform-agnostic: any board that renders
 * client-side ships its listing as JSON somewhere — an embedded state blob or an
 * XHR response — and this finds it without knowing the vendor.
 */
export const findJobsInJson = (
  value: unknown,
  baseUrl: string,
  maxDepth = 12,
): ScrapedJob[] => {
  const candidates: Candidate[] = [];

  const visit = (node: unknown, depth: number): void => {
    if (depth > maxDepth || !node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      const rows = node.filter(
        (entry): entry is Row =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      );
      if (rows.length >= 2) {
        const scored = rows.map(scoreRow);
        const hits = scored.filter((score) => score >= 4).length;
        // Most of the array must look like jobs — otherwise it is some other
        // collection that happens to have a "name" field.
        if (hits >= 2 && hits >= rows.length * 0.6) {
          const jobs = rows
            .map((row) => rowToJob(row, baseUrl))
            .filter((job): job is ScrapedJob => Boolean(job));
          if (jobs.length >= 2) {
            const total = scored.reduce((sum, score) => sum + score, 0);
            candidates.push({ jobs, score: total });
          }
        }
      }
      for (const entry of node) visit(entry, depth + 1);
      return;
    }

    for (const nested of Object.values(node as Row)) visit(nested, depth + 1);
  };

  visit(value, 0);
  if (!candidates.length) return [];

  // Prefer the richest array; ties go to the largest.
  candidates.sort((a, b) => b.score - a.score || b.jobs.length - a.jobs.length);
  const best = candidates[0];
  return best ? best.jobs : [];
};

const STATE_PATTERNS: RegExp[] = [
  /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  /window\.__NUXT__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
  /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
  /window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
  /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
  /window\.__remixContext\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
  /window\.SERVER_DATA\s*=\s*({[\s\S]*?});?\s*<\/script>/i,
];

/**
 * Jobs from state blobs that a server-rendered SPA leaves in its HTML. Saves a
 * full browser render for Next/Nuxt/Remix career pages.
 */
export const extractEmbeddedStateJobs = (
  html: string,
  pageUrl: string,
): ScrapedJob[] => {
  const blobs: string[] = [];

  for (const pattern of STATE_PATTERNS) {
    if (pattern.global) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        if (match[1]) blobs.push(match[1]);
      }
    } else {
      const match = pattern.exec(html);
      if (match?.[1]) blobs.push(match[1]);
    }
  }

  for (const blob of blobs) {
    const trimmed = blob.trim();
    if (trimmed.length < 40 || trimmed.length > 6_000_000) continue;
    if (!/(job|position|vacanc|offre|career|posting)/i.test(trimmed)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const jobs = findJobsInJson(parsed, pageUrl);
    if (jobs.length >= 2) return jobs;
  }

  return [];
};
