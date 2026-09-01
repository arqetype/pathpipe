import { createHash } from 'node:crypto';
import type { ScrapedJob } from './types';

/**
 * Query parameters that identify a visitor or a campaign rather than a job.
 * Leaving them in means the same posting looks "new" on every crawl.
 */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^_hs/i,
  /^mc_/i,
  /^pk_/i,
  /^vero_/i,
  /^ga_/i,
  /^hsa_/i,
  /^(gh_src|gclid|fbclid|msclkid|dclid|igshid|ttclid|twclid)$/i,
  /^(ref|referrer|referer|origin_referrer|originalreferer)$/i,
  /^(source|src|from|campaign|medium)$/i,
  /^(trk|trackingid|trackingtoken|refid|rid|sid|session|sessionid)$/i,
  /^(lever-source|lever-origin|lever-via)$/i,
];

const isTracking = (key: string): boolean =>
  TRACKING_PARAMS.some((p) => p.test(key));

/**
 * Canonical form of a URL for identity comparisons. Same posting reached by two
 * different links must normalise to the same string.
 */
export const normalizeUrl = (raw: string): string => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw.trim();
  }

  url.hash = '';
  url.protocol = url.protocol === 'http:' ? 'https:' : url.protocol;
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  const kept: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    if (!isTracking(key)) kept.push([key, value]);
  });
  kept.sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value] of kept) url.searchParams.append(key, value);

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
};

export const resolveUrl = (href: string, baseUrl: string): string | null => {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data):/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
};

export const hostOf = (raw: string): string => {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw;
  }
};

/**
 * Public suffixes made of two labels, so `careers.example.co.uk` is not read as
 * belonging to a vendor called `co.uk`.
 *
 * Deliberately short: only the suffixes job boards are actually served under. A
 * full public suffix list would be a dependency and a monthly update for a
 * handful of hostnames.
 */
const TWO_LABEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'co.jp',
  'co.nz',
  'co.za',
  'co.in',
  'com.au',
  'com.br',
  'com.mx',
  'com.tr',
  'com.sg',
  'com.es',
  'com.pl',
  'com.pt',
  'com.ua',
]);

/**
 * The vendor behind a hostname: `acme.jobs.personio.de` and
 * `other.jobs.personio.de` both answer `personio.de`.
 *
 * This is the unit rate limits are actually enforced on. A vendor that gives
 * every customer its own subdomain — Personio, Teamtailor, Workday — looks like
 * hundreds of separate hosts while being one server with one budget, so
 * throttling per hostname sends it hundreds of times what it allows.
 */
export const registrableDomain = (raw: string): string => {
  const host = hostOf(raw).toLowerCase().replace(/\.$/, '');
  if (!host.includes('.')) return host;
  // An IP address is its own vendor; there is nothing to strip.
  if (/^\d+(\.\d+){3}$/.test(host)) return host;
  const parts = host.split('.');
  const lastTwo = parts.slice(-2).join('.');
  if (parts.length > 2 && TWO_LABEL_SUFFIXES.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
};

/**
 * Identity of a posting. An ATS id beats a URL: boards routinely change their
 * slugs (title edits) while keeping the requisition id.
 */
export const jobKey = (job: ScrapedJob, platform?: string | null): string =>
  job.externalId
    ? `${platform ?? 'ats'}:${job.externalId}`
    : normalizeUrl(job.url);

export const sha1 = (value: string): string =>
  createHash('sha1').update(value).digest('hex');

/** Stable hash of a job set — the cheap "did anything change?" signal. */
export const fingerprintJobs = (
  jobs: ScrapedJob[],
  platform?: string | null,
): string =>
  sha1(
    jobs
      .map((j) => jobKey(j, platform))
      .sort()
      .join('\n'),
  );

/** URL shapes that a job detail page tends to have. */
export const JOB_URL_PATTERNS: RegExp[] = [
  /\/jobs?\//i,
  /\/job-?(?:detail|posting|opening)s?\//i,
  /\/careers?\/[^/]+\/?$/i,
  /\/positions?\//i,
  /\/openings?\//i,
  /\/opportunit(?:y|ies)\//i,
  /\/vacanc(?:y|ies)\//i,
  /\/postings?\//i,
  /\/requisitions?\//i,
  /\/offres?\//i,
  /\/emplois?\//i,
  /\/stellen(?:angebote)?\//i,
  /\/vagas?\//i,
  /[?&](?:job_?id|jobid|gh_jid|reqid|req_?id|posting_?id)=/i,
  /\/[a-z0-9-]+-(?:\d{4,}|[0-9a-f]{8}-[0-9a-f]{4})/i,
];
