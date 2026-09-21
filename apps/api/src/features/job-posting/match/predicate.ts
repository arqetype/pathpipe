import { JobPreference } from '@repo/db/entities/job-preference';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  MatchCriterion,
  importanceOf,
} from '@repo/db/types/job-preference/importance';
import {
  cityMatchSql,
  countryMatchSql,
  hasLocationSql,
  industryKnownSql,
  industryMatchSql,
  isConfigured,
  keywordsToRequiredTsQuery,
  lower,
  upper,
  type MatchPredicate,
} from './shared';

/**
 * The hard requirements, for the opt-in "only matches" toggle.
 *
 * Ranking keywords are deliberately absent: they are a ranking signal, and one
 * typo in a profile should not empty the board. Required keywords are the
 * exception, because a user who marks a term required has said the opposite.
 * Excluded keywords and companies are applied separately and always, because
 * asking not to see something is unambiguous.
 */
export const buildMatchPredicate = (
  preference: JobPreference | null,
): MatchPredicate | null => {
  if (!preference || !isConfigured(preference)) return null;

  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  const muted = (criterion: MatchCriterion): boolean =>
    importanceOf(preference.weights, criterion) <= 0;

  const domains = preference.domains ?? [];
  if (domains.length && !muted(MatchCriterion.DOMAIN)) {
    params.reqDomains = domains;
    clauses.push(`(job."domain" IS NULL OR job."domain" = ANY(:reqDomains))`);
  }

  const seniorities = preference.seniorities ?? [];
  if (seniorities.length && !muted(MatchCriterion.SENIORITY)) {
    params.reqSeniorities = seniorities;
    clauses.push(
      `(job."seniority" IS NULL OR job."seniority" = ANY(:reqSeniorities))`,
    );
  }

  const employmentTypes = preference.employmentTypes ?? [];
  if (employmentTypes.length && !muted(MatchCriterion.EMPLOYMENT_TYPE)) {
    params.reqTypes = employmentTypes;
    clauses.push(
      `(job."employmentType" IS NULL OR job."employmentType" = ANY(:reqTypes))`,
    );
  }

  const cities = lower(preference.cities ?? []);
  const countries = upper(preference.countries ?? []);
  const remoteTypes = preference.remoteTypes ?? [];
  // Somebody willing to move has said no place disqualifies an offer, so the
  // location clause would only contradict them.
  if (
    (cities.length || countries.length) &&
    !preference.openToRelocation &&
    !muted(MatchCriterion.LOCATION)
  ) {
    params.matchCities = cities.length ? cities : [''];
    params.matchCountries = countries.length ? countries : [''];
    const acceptsRemote =
      !remoteTypes.length || remoteTypes.includes(RemoteType.REMOTE);
    clauses.push(
      `(${[
        cities.length ? cityMatchSql : null,
        countries.length ? countryMatchSql : null,
        acceptsRemote ? `job."remoteType" = 'REMOTE'` : null,
        // An offer whose location we failed to read is not evidence of a
        // mismatch, so it stays visible.
        `NOT ${hasLocationSql}`,
      ]
        .filter(Boolean)
        .join(' OR ')})`,
    );
  }

  if (remoteTypes.length && !muted(MatchCriterion.REMOTE_TYPE)) {
    params.reqRemote = remoteTypes;
    clauses.push(
      `(job."remoteType" IS NULL OR job."remoteType" = ANY(:reqRemote))`,
    );
  }

  const requiredQuery = keywordsToRequiredTsQuery(
    preference.requiredKeywords ?? [],
  );
  if (requiredQuery) {
    params.reqKeywords = requiredQuery;
    clauses.push(`job."searchVector" @@ to_tsquery('simple', :reqKeywords)`);
  }

  const industries = preference.industries ?? [];
  if (industries.length && !muted(MatchCriterion.INDUSTRY)) {
    params.matchIndustries = industries;
    clauses.push(`(${industryMatchSql} OR NOT ${industryKnownSql})`);
  }

  if (preference.minSalary && !muted(MatchCriterion.SALARY)) {
    params.reqSalary = preference.minSalary;
    const currency = preference.salaryCurrency?.trim().toUpperCase();
    if (currency) params.reqCurrency = currency;
    const comparable = currency
      ? `(job."salaryCurrency" IS NULL OR upper(job."salaryCurrency") = :reqCurrency)`
      : 'true';
    clauses.push(
      `(job."salaryMax" IS NULL AND job."salaryMin" IS NULL
        OR NOT ${comparable}
        OR job."salaryMax" >= :reqSalary OR job."salaryMin" >= :reqSalary)`,
    );
  }

  if (!clauses.length) return null;
  return { sql: clauses.join(' AND '), params };
};
