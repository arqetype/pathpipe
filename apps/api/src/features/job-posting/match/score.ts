import { JobPreference } from '@repo/db/entities/job-preference';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  IMPORTANCE_MULTIPLIER,
  MatchCriterion,
  MatchImportance,
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
  keywordsToTsQuery,
  lower,
  upper,
} from './shared';

export interface MatchContext {
  preference: JobPreference | null;
  followsAny: boolean;
}

const WEIGHTS = {
  domain: 40,
  seniority: 20,
  motivation: 15,
  resume: 20,
  employmentType: 35,
  city: 30,
  country: 20,
  remoteFallback: 22,
  relocation: 10,
  remoteType: 15,
  title: 35,
  keyword: 25,
  required: 30,
  industry: 15,
  salary: 10,
  freshness: 10,
  followed: 8,
} as const;

// Below the strong-fit band.
const ESSENTIAL_MISS_CEILING = 69;

const rankSql = (hit: number, param: string): string =>
  `LEAST(${hit}, ${hit} * ts_rank_cd(job."searchVector", to_tsquery('simple', ${param}), 32) * 4)`;

const toLikePatterns = (values: string[]): string[] =>
  [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .map((value) => value.replace(/[\\%_]/g, (char) => `\\${char}`)),
    ),
  ].map((value) => `%${value}%`);

export interface MatchSql {
  score: string;
  params: Record<string, unknown>;
}

const followedSql = `EXISTS (
  SELECT 1 FROM "company_watch" mw
  WHERE mw."companyId" = job."companyId" AND mw."userId" = :matchUserId
)`;

export const buildMatchSql = (
  userId: string,
  { preference, followsAny }: MatchContext,
): MatchSql | null => {
  if (!preference || !isConfigured(preference)) return null;

  const parts: string[] = [];
  const maxParts: string[] = [];
  const caps: string[] = [];
  const params: Record<string, unknown> = { matchUserId: userId };

  const add = (points: string, ceiling: string | number): void => {
    parts.push(points);
    maxParts.push(String(ceiling));
  };

  const weightFor = (criterion: MatchCriterion): number =>
    importanceOf(preference.weights, criterion);

  const isEssential = (criterion: MatchCriterion): boolean =>
    weightFor(criterion) >= IMPORTANCE_MULTIPLIER[MatchImportance.ESSENTIAL];

  const capIfEssential = (criterion: MatchCriterion, missed: string): void => {
    if (!isEssential(criterion)) return;
    caps.push(
      `CASE WHEN ${missed} THEN ${ESSENTIAL_MISS_CEILING} ELSE 100 END`,
    );
  };

  const domains = preference.domains ?? [];
  const domainWeight = weightFor(MatchCriterion.DOMAIN);
  if (domains.length && domainWeight > 0) {
    params.matchDomains = domains;
    const hit = WEIGHTS.domain * domainWeight;
    add(
      `CASE WHEN job."domain" = ANY(:matchDomains) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."domain" IS NULL THEN 0 ELSE ${hit} END`,
    );
    capIfEssential(
      MatchCriterion.DOMAIN,
      `job."domain" IS NOT NULL AND NOT (job."domain" = ANY(:matchDomains))`,
    );
  }

  const seniorities = preference.seniorities ?? [];
  const seniorityWeight = weightFor(MatchCriterion.SENIORITY);
  if (seniorities.length && seniorityWeight > 0) {
    params.matchSeniorities = seniorities;
    const hit = WEIGHTS.seniority * seniorityWeight;
    add(
      `CASE WHEN job."seniority" = ANY(:matchSeniorities) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."seniority" IS NULL THEN 0 ELSE ${hit} END`,
    );
    capIfEssential(
      MatchCriterion.SENIORITY,
      `job."seniority" IS NOT NULL AND NOT (job."seniority" = ANY(:matchSeniorities))`,
    );
  }

  const motivationWeight = weightFor(MatchCriterion.MOTIVATION);
  const motivationQuery = keywordsToTsQuery(preference.motivations ?? []);
  if (motivationQuery && motivationWeight > 0) {
    params.matchMotivations = motivationQuery;
    const hit = WEIGHTS.motivation * motivationWeight;
    add(rankSql(hit, ':matchMotivations'), hit);
  }

  const resumeWeight = weightFor(MatchCriterion.RESUME);
  const resumeQuery = keywordsToTsQuery(preference.resumeKeywords ?? []);
  if (resumeQuery && resumeWeight > 0) {
    params.matchResume = resumeQuery;
    const hit = WEIGHTS.resume * resumeWeight;
    add(rankSql(hit, ':matchResume'), hit);
  }

  const employmentTypes = preference.employmentTypes ?? [];
  const employmentWeight = weightFor(MatchCriterion.EMPLOYMENT_TYPE);
  if (employmentTypes.length && employmentWeight > 0) {
    params.matchTypes = employmentTypes;
    const hit = WEIGHTS.employmentType * employmentWeight;
    add(
      `CASE WHEN job."employmentType" = ANY(:matchTypes) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."employmentType" IS NULL THEN 0 ELSE ${hit} END`,
    );
    capIfEssential(
      MatchCriterion.EMPLOYMENT_TYPE,
      `job."employmentType" IS NOT NULL AND NOT (job."employmentType" = ANY(:matchTypes))`,
    );
  }

  const cities = lower(preference.cities ?? []);
  const countries = upper(preference.countries ?? []);
  const remoteTypes = preference.remoteTypes ?? [];
  const locationWeight = weightFor(MatchCriterion.LOCATION);
  if ((cities.length || countries.length) && locationWeight > 0) {
    params.matchCities = cities.length ? cities : [''];
    params.matchCountries = countries.length ? countries : [''];
    const acceptsRemote =
      !remoteTypes.length || remoteTypes.includes(RemoteType.REMOTE);
    const city = WEIGHTS.city * locationWeight;
    const country = WEIGHTS.country * locationWeight;
    const remote = WEIGHTS.remoteFallback * locationWeight;
    const elsewhere = preference.openToRelocation
      ? WEIGHTS.relocation * locationWeight
      : 0;
    add(
      `CASE
         WHEN ${cities.length ? cityMatchSql : 'false'} THEN ${city}
         WHEN ${countries.length ? countryMatchSql : 'false'} THEN ${country}
         WHEN ${acceptsRemote ? `job."remoteType" = 'REMOTE'` : 'false'} THEN ${remote}
         WHEN NOT ${hasLocationSql} THEN 0
         ELSE ${elsewhere}
       END`,
      `CASE WHEN NOT ${hasLocationSql} THEN 0 ELSE ${city} END`,
    );
    if (!preference.openToRelocation) {
      capIfEssential(
        MatchCriterion.LOCATION,
        `${hasLocationSql} AND NOT (${[
          cities.length ? cityMatchSql : null,
          countries.length ? countryMatchSql : null,
          acceptsRemote ? `job."remoteType" = 'REMOTE'` : null,
        ]
          .filter(Boolean)
          .join(' OR ')})`,
      );
    }
  }

  const remoteWeight = weightFor(MatchCriterion.REMOTE_TYPE);
  if (remoteTypes.length && remoteWeight > 0) {
    params.matchRemote = remoteTypes;
    const hit = WEIGHTS.remoteType * remoteWeight;
    add(
      `CASE WHEN job."remoteType" = ANY(:matchRemote) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."remoteType" IS NULL THEN 0 ELSE ${hit} END`,
    );
    capIfEssential(
      MatchCriterion.REMOTE_TYPE,
      `job."remoteType" IS NOT NULL AND NOT (job."remoteType" = ANY(:matchRemote))`,
    );
  }

  const titleWeight = weightFor(MatchCriterion.TITLE);
  const titlePatterns = toLikePatterns(preference.titles ?? []);
  if (titlePatterns.length && titleWeight > 0) {
    params.matchTitles = titlePatterns;
    const hit = WEIGHTS.title * titleWeight;
    add(
      `CASE WHEN lower(job."title") LIKE ANY(:matchTitles) THEN ${hit} ELSE 0 END`,
      hit,
    );
  }

  const keywordWeight = weightFor(MatchCriterion.KEYWORDS);
  const keywordQuery = keywordsToTsQuery(preference.keywords ?? []);
  if (keywordQuery && keywordWeight > 0) {
    params.matchKeywords = keywordQuery;
    const hit = WEIGHTS.keyword * keywordWeight;
    add(rankSql(hit, ':matchKeywords'), hit);
  }

  const requiredQuery = keywordsToRequiredTsQuery(
    preference.requiredKeywords ?? [],
  );
  if (requiredQuery) {
    params.matchRequired = requiredQuery;
    add(
      `CASE
         WHEN job."searchVector" @@ to_tsquery('simple', :matchRequired) THEN ${WEIGHTS.required}
         ELSE 0
       END`,
      WEIGHTS.required,
    );
  }

  const industries = preference.industries ?? [];
  const industryWeight = weightFor(MatchCriterion.INDUSTRY);
  if (industries.length && industryWeight > 0) {
    params.matchIndustries = industries;
    const hit = WEIGHTS.industry * industryWeight;
    add(
      `CASE WHEN ${industryMatchSql} THEN ${hit} ELSE 0 END`,
      `CASE WHEN NOT ${industryKnownSql} THEN 0 ELSE ${hit} END`,
    );
  }

  const salaryWeight = weightFor(MatchCriterion.SALARY);
  if (preference.minSalary && salaryWeight > 0) {
    params.matchSalary = preference.minSalary;
    const hit = WEIGHTS.salary * salaryWeight;
    const currency = preference.salaryCurrency?.trim().toUpperCase();
    const comparable = currency
      ? `(job."salaryCurrency" IS NULL OR upper(job."salaryCurrency") = :matchCurrency)`
      : 'true';
    if (currency) params.matchCurrency = currency;
    const priced = `(job."salaryMax" IS NOT NULL OR job."salaryMin" IS NOT NULL) AND ${comparable}`;
    add(
      `CASE
         WHEN ${priced} AND (job."salaryMax" >= :matchSalary OR job."salaryMin" >= :matchSalary) THEN ${hit}
         ELSE 0
       END`,
      `CASE WHEN ${priced} THEN ${hit} ELSE 0 END`,
    );
  }

  const freshnessWeight = weightFor(MatchCriterion.FRESHNESS);
  if (preference.maxAgeDays && freshnessWeight > 0) {
    params.matchMaxAge = preference.maxAgeDays;
    const hit = WEIGHTS.freshness * freshnessWeight;
    add(
      `CASE
         WHEN job."postedAt" IS NULL THEN 0
         ELSE ${hit} * GREATEST(0, 1 - (
           EXTRACT(EPOCH FROM (now() - job."postedAt")) / 86400.0
         ) / (:matchMaxAge * 2.0))
       END`,
      `CASE WHEN job."postedAt" IS NULL THEN 0 ELSE ${hit} END`,
    );
  }

  if (followsAny) {
    add(
      `CASE WHEN ${followedSql} THEN ${WEIGHTS.followed} ELSE 0 END`,
      WEIGHTS.followed,
    );
  }

  if (!parts.length) return null;

  // LEAST skips NULL: cap outside COALESCE.
  return {
    score: `LEAST(100, ${caps.length ? `${caps.join(', ')}, ` : ''}GREATEST(0, COALESCE(round(
      (${parts.join(' + ')}) * 100.0 / NULLIF(${maxParts.join(' + ')}, 0)
    ), 0)))::int`,
    params,
  };
};
