import { JobPreference } from '@repo/db/entities/job-preference';

/**
 * The vocabulary every half of the matcher shares.
 *
 * Three rules shape everything built on top of it:
 *
 *   - **An unset preference is not a filter.** An empty list means "no opinion",
 *     so a profile that names only a contract type still sees every offer, just
 *     ordered differently.
 *   - **An unknown value on the offer is not a rejection.** Boards leave the
 *     contract type, the salary or the location blank constantly. A criterion
 *     the offer says nothing about is dropped from both the points and the
 *     total they are measured against, so it neither rewards nor penalises —
 *     missing data is our problem, not the user's.
 *   - **Not every wish weighs the same.** Two people fill in the same fields and
 *     mean different things by them, so each criterion carries an importance
 *     the user sets, and a criterion marked ignored drops out of the score and
 *     out of the total it is measured against.
 *
 * The score is a percentage of what this particular profile could have awarded,
 * so a user who filled in one field and a user who filled in six both see
 * numbers that mean the same thing.
 */

export interface MatchPredicate {
  sql: string;
  params: Record<string, unknown>;
}

export const lower = (values: string[]): string[] =>
  values.map((value) => value.trim().toLowerCase()).filter(Boolean);

export const upper = (values: string[]): string[] =>
  values.map((value) => value.trim().toUpperCase()).filter(Boolean);

/** Every part of a profile that says something the scorer can use. */
const SIGNALS: Array<(preference: JobPreference) => boolean> = [
  (p) => Boolean(p.domains?.length),
  (p) => Boolean(p.seniorities?.length),
  (p) => Boolean(p.employmentTypes?.length),
  (p) => Boolean(p.remoteTypes?.length),
  (p) => Boolean(p.countries?.length || p.cities?.length),
  (p) => Boolean(p.titles?.length),
  (p) => Boolean(p.keywords?.length),
  (p) => Boolean(p.requiredKeywords?.length),
  (p) => Boolean(p.industries?.length),
  (p) => Boolean(p.motivations?.length),
  (p) => Boolean(p.resumeKeywords?.length),
  (p) => Boolean(p.minSalary),
  (p) => Boolean(p.maxAgeDays),
  (p) => Boolean(p.excludedKeywords?.length || p.excludedCompanyIds?.length),
];

/**
 * A profile with nothing in it cannot rank anything.
 *
 * Every signal counts, including the ones that only rank — a profile naming
 * three domains and a CV is a real profile, and treating it as unconfigured
 * used to hide the scores it had earned behind a "set this up" prompt.
 */
export const isConfigured = (preference: JobPreference | null): boolean =>
  Boolean(preference && SIGNALS.some((has) => has(preference)));

/**
 * How much of the profile carries a signal, 0–100.
 *
 * Measured against the same list the scorer reads, so the number cannot promise
 * more precision than the ranking actually gets.
 */
export const completenessOf = (preference: JobPreference | null): number => {
  if (!preference) return 0;
  const filled = SIGNALS.filter((has) => has(preference)).length;
  return Math.round((filled * 100) / SIGNALS.length);
};

/**
 * An OR-of-prefixes `tsquery` from the profile's keywords.
 *
 * Terms are stripped to what Postgres' own tokenizer keeps and then quoted, so
 * nothing a user types into their profile can be read as a `tsquery` operator.
 */
export const keywordsToTsQuery = (keywords: string[]): string | null =>
  buildTsQuery(keywords, ' | ');

/**
 * The same, but every term must be present.
 *
 * Multi-word entries stay conjunctive within themselves — "machine learning"
 * becomes `machine & learning` — which is what somebody typing a phrase into a
 * required field means.
 */
export const keywordsToRequiredTsQuery = (keywords: string[]): string | null =>
  buildTsQuery(keywords, ' & ');

const buildTsQuery = (keywords: string[], join: string): string | null => {
  const terms = keywords
    .flatMap((keyword) =>
      keyword
        .toLowerCase()
        .split(/[^\p{L}\p{N}+#.]+/u)
        .map((term) => term.replace(/^[.+#]+|[.+#]+$/g, '')),
    )
    .filter((term) => term.length > 0)
    .slice(0, 40);

  if (!terms.length) return null;
  return [...new Set(terms)].map((term) => `'${term}':*`).join(join);
};

// Subqueries rather than joins: these expressions are spliced into several
// different query builders, and only some of them join the company table.

export const cityMatchSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND lower(ml."city") = ANY(:matchCities)
)`;

export const countryMatchSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND upper(ml."country") = ANY(:matchCountries)
)`;

export const hasLocationSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND (ml."city" <> '' OR ml."country" <> '')
)`;

export const industryMatchSql = `EXISTS (
  SELECT 1 FROM "company" mc
  WHERE mc."id" = job."companyId" AND mc."industry" = ANY(:matchIndustries)
)`;

export const industryKnownSql = `EXISTS (
  SELECT 1 FROM "company" mc
  WHERE mc."id" = job."companyId" AND mc."industry" IS NOT NULL
)`;
