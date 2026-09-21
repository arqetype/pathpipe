import { JobPreference } from '@repo/db/entities/job-preference';

export interface MatchPredicate {
  sql: string;
  params: Record<string, unknown>;
}

export const lower = (values: string[]): string[] =>
  values.map((value) => value.trim().toLowerCase()).filter(Boolean);

export const upper = (values: string[]): string[] =>
  values.map((value) => value.trim().toUpperCase()).filter(Boolean);

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

export const isConfigured = (preference: JobPreference | null): boolean =>
  Boolean(preference && SIGNALS.some((has) => has(preference)));

export const completenessOf = (preference: JobPreference | null): number => {
  if (!preference) return 0;
  const filled = SIGNALS.filter((has) => has(preference)).length;
  return Math.round((filled * 100) / SIGNALS.length);
};

export const keywordsToTsQuery = (keywords: string[]): string | null =>
  buildTsQuery(keywords, ' | ', true);

// No prefix: intern would match internal.
export const keywordsToRequiredTsQuery = (keywords: string[]): string | null =>
  buildTsQuery(keywords, ' & ', false);

const buildTsQuery = (
  keywords: string[],
  join: string,
  prefix: boolean,
): string | null => {
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
  return [...new Set(terms)]
    .map((term) => (prefix ? `'${term}':*` : `'${term}'`))
    .join(join);
};

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
