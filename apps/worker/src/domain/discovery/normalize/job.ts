import type { DiscoveredJob } from '../types';
import { jobKey, normalizeUrl } from '../url';
import { formatLocations, parseLocations } from '@repo/db/parsing/location';
import { classifyDomain, classifySeniority } from '@repo/db/parsing/classify';
import { looksLikeHtml, sanitizeHtml } from '@repo/db/parsing/sanitize';
import { normalizeEmploymentType } from './employment';
import { cleanLocation, isRemote, normalizeRemoteType } from './location';
import { asSalary, parseSalary } from './salary';
import { stripHtml } from './text';
import { cleanTitle, isPlausibleTitle } from './title';

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'number') {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  // Expiry dates are legitimately future.
  const year = date.getUTCFullYear();
  if (year < 2000 || year > new Date().getUTCFullYear() + 5) return undefined;
  return date.toISOString();
};

export const normalizeJob = (job: DiscoveredJob): DiscoveredJob | null => {
  const title = cleanTitle(job.title ?? '');
  if (!isPlausibleTitle(title)) return null;
  const url = normalizeUrl(job.url ?? '');
  if (!/^https?:\/\//i.test(url)) return null;

  const rawHtml =
    job.descriptionHtml ??
    (job.description && looksLikeHtml(job.description)
      ? job.description
      : undefined);
  const descriptionHtml = rawHtml
    ? sanitizeHtml(rawHtml).slice(0, 60000) || undefined
    : undefined;
  const plainSource = job.description ?? rawHtml;
  const description = plainSource
    ? stripHtml(plainSource).slice(0, 20000) || undefined
    : undefined;

  const parsedLocations = parseLocations([
    ...(job.locations ?? []),
    job.location,
  ]);
  const location =
    formatLocations(parsedLocations) ?? cleanLocation(job.location);
  const department = job.department ? cleanLocation(job.department) : undefined;
  const stated = {
    salaryMin: asSalary(job.salaryMin),
    salaryMax: asSalary(job.salaryMax),
    salaryCurrency: job.salaryCurrency,
  };
  const salary =
    stated.salaryMin || stated.salaryMax
      ? stated
      : parseSalary(description?.slice(0, 4000));

  return {
    externalId: job.externalId ? String(job.externalId) : undefined,
    title,
    url,
    description,
    descriptionHtml,
    location,
    parsedLocations,
    department,
    domain: job.domain ?? classifyDomain(title, department),
    seniority: job.seniority ?? classifySeniority(title),
    employmentType: normalizeEmploymentType(
      job.employmentType,
      title,
      description?.slice(0, 400),
    ),
    remote: job.remote ?? isRemote(title, location, job.employmentType),
    remoteType:
      job.remoteType ??
      // Board-labelled remote outranks a guess.
      parsedLocations.find((place) => place.remote)?.remote ??
      normalizeRemoteType(job.remote, title, location, job.employmentType),
    salaryMin: salary.salaryMin ?? undefined,
    salaryMax: salary.salaryMax ?? undefined,
    salaryCurrency: salary.salaryCurrency ?? undefined,
    postedAt: toIsoDate(job.postedAt),
    validThrough: toIsoDate(job.validThrough),
  };
};

const richness = (job: DiscoveredJob): number =>
  [
    job.description,
    job.descriptionHtml,
    job.location,
    job.parsedLocations?.length,
    job.department,
    job.postedAt,
    job.validThrough,
    job.salaryMin,
    job.employmentType,
    job.remoteType,
    job.externalId,
  ].filter(Boolean).length;

export const normalizeJobs = (
  jobs: DiscoveredJob[],
  platform?: string | null,
): DiscoveredJob[] => {
  const byKey = new Map<string, DiscoveredJob>();
  for (const raw of jobs) {
    const job = normalizeJob(raw);
    if (!job) continue;
    const key = jobKey(job, platform);
    const existing = byKey.get(key);
    if (!existing || richness(job) > richness(existing)) byKey.set(key, job);
  }
  return [...byKey.values()];
};
