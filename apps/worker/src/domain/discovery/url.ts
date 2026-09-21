import { createHash } from 'node:crypto';
import type { DiscoveredJob } from './types';

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

const hostOf = (raw: string): string => {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw;
  }
};

// Rate limits are per vendor domain.
export const registrableDomain = (raw: string): string => {
  const host = hostOf(raw).toLowerCase().replace(/\.$/, '');
  if (!host.includes('.')) return host;
  if (/^\d+(\.\d+){3}$/.test(host)) return host;
  const parts = host.split('.');
  const lastTwo = parts.slice(-2).join('.');
  if (parts.length > 2 && TWO_LABEL_SUFFIXES.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
};

export const jobKey = (job: DiscoveredJob, platform?: string | null): string =>
  job.externalId
    ? `${platform ?? 'ats'}:${job.externalId}`
    : normalizeUrl(job.url);

export const sha1 = (value: string): string =>
  createHash('sha1').update(value).digest('hex');

export const fingerprintJobs = (
  jobs: DiscoveredJob[],
  platform?: string | null,
): string =>
  sha1(
    jobs
      .map((j) => jobKey(j, platform))
      .sort()
      .join('\n'),
  );
