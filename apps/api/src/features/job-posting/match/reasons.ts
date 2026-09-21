import { JobPreference } from '@repo/db/entities/job-preference';
import { JobPosting } from '@repo/db/entities/job-posting';
import {
  MatchCriterion,
  importanceOf,
} from '@repo/db/types/job-preference/importance';
import type { JobMatchReason } from '@repo/db/query/job-posting';
import { isConfigured, lower, upper } from './shared';

/**
 * Why an offer scored what it did, in the words the card shows.
 *
 * Computed in TypeScript from the row we already loaded rather than returned
 * from SQL: the reasons are per-offer prose, and pulling six extra expressions
 * through every query to build them would cost more than it explains.
 */
export const buildMatchReasons = (
  posting: JobPosting & {
    locations?: Array<{ city: string; country: string }>;
  },
  preference: JobPreference | null,
  followed: boolean,
): JobMatchReason[] => {
  if (!preference || !isConfigured(preference)) return [];

  const reasons: JobMatchReason[] = [];
  const locations = posting.locations ?? [];
  const muted = (criterion: MatchCriterion): boolean =>
    importanceOf(preference.weights, criterion) <= 0;

  const domains = preference.domains ?? [];
  if (domains.length && posting.domain && !muted(MatchCriterion.DOMAIN)) {
    reasons.push({
      kind: 'domain',
      label: posting.domain.toLowerCase().replace(/_/g, ' '),
      met: domains.includes(posting.domain),
    });
  }

  const seniorities = preference.seniorities ?? [];
  if (
    seniorities.length &&
    posting.seniority &&
    !muted(MatchCriterion.SENIORITY)
  ) {
    reasons.push({
      kind: 'seniority',
      label: posting.seniority.toLowerCase(),
      met: seniorities.includes(posting.seniority),
    });
  }

  const employmentTypes = preference.employmentTypes ?? [];
  if (
    employmentTypes.length &&
    posting.employmentType &&
    !muted(MatchCriterion.EMPLOYMENT_TYPE)
  ) {
    reasons.push({
      kind: 'employmentType',
      label: posting.employmentType.toLowerCase().replace(/_/g, ' '),
      met: employmentTypes.includes(posting.employmentType),
    });
  }

  const cities = lower(preference.cities ?? []);
  if (cities.length) {
    const hit = locations.find((location) =>
      cities.includes((location.city ?? '').toLowerCase()),
    );
    if (hit) reasons.push({ kind: 'city', label: hit.city, met: true });
  }

  const countries = upper(preference.countries ?? []);
  if (countries.length && !reasons.some((reason) => reason.kind === 'city')) {
    const hit = locations.find((location) =>
      countries.includes((location.country ?? '').toUpperCase()),
    );
    if (hit) reasons.push({ kind: 'country', label: hit.country, met: true });
  }

  const remoteTypes = preference.remoteTypes ?? [];
  if (remoteTypes.length && posting.remoteType) {
    reasons.push({
      kind: 'remote',
      label: posting.remoteType.toLowerCase().replace(/_/g, ' '),
      met: remoteTypes.includes(posting.remoteType),
    });
  }

  const title = posting.title.toLowerCase();
  for (const wanted of (preference.titles ?? []).slice(0, 2)) {
    const term = wanted.trim().toLowerCase();
    if (term && title.includes(term)) {
      reasons.push({ kind: 'title', label: wanted, met: true });
    }
  }

  const haystack =
    `${posting.title} ${posting.description ?? ''}`.toLowerCase();
  const mentions = (values: string[]): string[] =>
    values.filter((value) => haystack.includes(value.trim().toLowerCase()));

  for (const keyword of mentions(preference.requiredKeywords ?? []).slice(
    0,
    3,
  )) {
    reasons.push({ kind: 'required', label: keyword, met: true });
  }
  for (const keyword of mentions(preference.keywords ?? []).slice(0, 4)) {
    reasons.push({ kind: 'keyword', label: keyword, met: true });
  }
  for (const motivation of mentions(preference.motivations ?? []).slice(0, 2)) {
    reasons.push({ kind: 'motivation', label: motivation, met: true });
  }
  for (const skill of mentions(preference.resumeKeywords ?? []).slice(0, 4)) {
    reasons.push({ kind: 'resume', label: skill, met: true });
  }

  const industries = preference.industries ?? [];
  if (industries.length && posting.company?.industry) {
    reasons.push({
      kind: 'industry',
      label: posting.company.industry.toLowerCase().replace(/_/g, ' '),
      met: industries.includes(posting.company.industry),
    });
  }

  if (preference.minSalary && posting.salaryMax) {
    reasons.push({
      kind: 'salary',
      label: `${Math.round(posting.salaryMax / 1000)}k`,
      met: posting.salaryMax >= preference.minSalary,
    });
  }

  if (followed) {
    reasons.push({ kind: 'followed', label: 'Followed', met: true });
  }

  return reasons;
};
