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
  keywordsToTsQuery,
  lower,
  upper,
} from './shared';

/** The score an offer earns against one profile, as a SQL expression. */

export interface MatchContext {
  preference: JobPreference | null;
  /** The user follows at least one company, so the bonus can be earned. */
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

/**
 * Text-rank credit, as a share of `hit`.
 *
 * `ts_rank_cd` with normalisation 32 lands in [0, 1), and a term found only in
 * a description (weight C) ranks around 0.17 where the same term in the title
 * ranks 0.5. Scaling by 4 means a real hit in the body earns most of the
 * criterion and a title hit earns all of it — at the previous factor of 2 no
 * description match could ever pay more than a third, which is what kept whole
 * profiles from reaching the board's own "strong fit" band.
 */
const rankSql = (hit: number, param: string): string =>
  `LEAST(${hit}, ${hit} * ts_rank_cd(job."searchVector", to_tsquery('simple', ${param}), 32) * 4)`;

/** `%term%` patterns for a title match, with LIKE's own wildcards escaped. */
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
  /** Expression producing a 0–100 integer. */
  score: string;
  params: Record<string, unknown>;
}

const followedSql = `EXISTS (
  SELECT 1 FROM "company_watch" mw
  WHERE mw."companyId" = job."companyId" AND mw."userId" = :matchUserId
)`;

/**
 * The score expression, and the parameters it needs.
 *
 * Returns null when the profile expresses nothing — the caller then leaves the
 * score out of the response entirely rather than showing everyone 0%.
 */
export const buildMatchSql = (
  userId: string,
  { preference, followsAny }: MatchContext,
): MatchSql | null => {
  if (!preference || !isConfigured(preference)) return null;

  const parts: string[] = [];
  /**
   * What this offer could have scored, term by term.
   *
   * Per row rather than per profile: a board that did not say whether a role is
   * remote, or what it pays, must not cost the offer the points it never had a
   * chance to earn. A criterion the offer says nothing about drops out of both
   * sides of the ratio, so the score reads "of what could be checked, this much
   * matched" — which is the only reading under which a genuine fit reaches the
   * high numbers the board's own bands promise.
   */
  const maxParts: string[] = [];
  const params: Record<string, unknown> = { matchUserId: userId };

  const add = (points: string, ceiling: string | number): void => {
    parts.push(points);
    maxParts.push(String(ceiling));
  };

  const weightFor = (criterion: MatchCriterion): number =>
    importanceOf(preference.weights, criterion);

  // What they want to work on is the strongest single signal a profile carries,
  // so it is weighted above everything else.
  const domains = preference.domains ?? [];
  const domainWeight = weightFor(MatchCriterion.DOMAIN);
  if (domains.length && domainWeight > 0) {
    params.matchDomains = domains;
    const hit = WEIGHTS.domain * domainWeight;
    add(
      `CASE WHEN job."domain" = ANY(:matchDomains) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."domain" IS NULL THEN 0 ELSE ${hit} END`,
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
  }

  const motivationWeight = weightFor(MatchCriterion.MOTIVATION);
  const motivationQuery = keywordsToTsQuery(preference.motivations ?? []);
  if (motivationQuery && motivationWeight > 0) {
    params.matchMotivations = motivationQuery;
    const hit = WEIGHTS.motivation * motivationWeight;
    add(rankSql(hit, ':matchMotivations'), hit);
  }

  // The CV is a weaker signal than a stated preference — it says what somebody
  // has done, not what they want next — so it ranks rather than decides.
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
  }

  const cities = lower(preference.cities ?? []);
  const countries = upper(preference.countries ?? []);
  const remoteTypes = preference.remoteTypes ?? [];
  const locationWeight = weightFor(MatchCriterion.LOCATION);
  if ((cities.length || countries.length) && locationWeight > 0) {
    params.matchCities = cities.length ? cities : [''];
    params.matchCountries = countries.length ? countries : [''];
    // Somebody who says they will work remotely is served by a remote offer
    // anywhere, so it scores nearly as well as the city they asked for.
    const acceptsRemote =
      !remoteTypes.length || remoteTypes.includes(RemoteType.REMOTE);
    const city = WEIGHTS.city * locationWeight;
    const country = WEIGHTS.country * locationWeight;
    const remote = WEIGHTS.remoteFallback * locationWeight;
    // Somebody open to moving is not mismatched by an address, only less well
    // served than by the places they named.
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
  }

  const remoteWeight = weightFor(MatchCriterion.REMOTE_TYPE);
  if (remoteTypes.length && remoteWeight > 0) {
    params.matchRemote = remoteTypes;
    const hit = WEIGHTS.remoteType * remoteWeight;
    add(
      `CASE WHEN job."remoteType" = ANY(:matchRemote) THEN ${hit} ELSE 0 END`,
      `CASE WHEN job."remoteType" IS NULL THEN 0 ELSE ${hit} END`,
    );
  }

  // A title match is the closest thing to the user naming the job outright, so
  // it is checked against the title column instead of the whole document: a
  // description that merely mentions "data engineer" is not the same offer.
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

  // Required terms score all or nothing, with no credit for a missing value:
  // "must mention" is a statement about the offer's text, and text is never
  // missing the way a structured field is.
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
    // Comparing 45000 EUR to 45000 CZK is worse than not comparing at all, so
    // an offer priced in another currency is treated as unpriced.
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

  // Freshness decays rather than cuts off: an offer one day past the window is
  // not the same as one from last quarter, and neither should vanish.
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

  // NULLIF guards the offer that said nothing this profile asks about: it
  // scores 0 rather than dividing by zero.
  return {
    score: `LEAST(100, GREATEST(0, COALESCE(round(
      (${parts.join(' + ')}) * 100.0 / NULLIF(${maxParts.join(' + ')}, 0)
    ), 0)))::int`,
    params,
  };
};
