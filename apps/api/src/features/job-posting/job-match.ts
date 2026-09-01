import { JobPreference } from '@repo/db/entities/job-preference';
import { JobPosting } from '@repo/db/entities/job-posting';
import { RemoteType } from '@repo/db/types/job-posting/remote-type';
import {
  MatchCriterion,
  importanceOf,
} from '@repo/db/types/job-preference/importance';
import type { JobMatchReason } from '@repo/db/query/job-posting';

/**
 * Scoring an offer against what a user said they want.
 *
 * Three rules shape everything here:
 *
 *   - **An unset preference is not a filter.** An empty list means "no opinion",
 *     so a profile that names only a contract type still sees every offer, just
 *     ordered differently.
 *   - **An unknown value on the offer is not a rejection.** Boards leave the
 *     contract type or the location blank constantly; scoring those as zero
 *     would bury exactly the offers whose data we failed to read, which is our
 *     problem and not the user's.
 *   - **Not every wish weighs the same.** Two people fill in the same fields and
 *     mean different things by them, so each criterion carries an importance
 *     the user sets, and a criterion marked ignored drops out of the score and
 *     out of the total it is measured against.
 *
 * The score is a percentage of what this particular profile could have awarded,
 * so a user who filled in one field and a user who filled in six both see
 * numbers that mean the same thing.
 */

export interface MatchContext {
  preference: JobPreference | null;
  /** The user follows at least one company, so the bonus can be earned. */
  followsAny: boolean;
}

const WEIGHTS = {
  domain: 40,
  domainUnknown: 12,
  seniority: 20,
  seniorityUnknown: 7,
  motivation: 15,
  resume: 20,
  employmentType: 35,
  employmentTypeUnknown: 12,
  city: 30,
  country: 20,
  remoteFallback: 22,
  relocation: 10,
  locationUnknown: 8,
  remoteType: 15,
  remoteTypeUnknown: 5,
  title: 35,
  keyword: 25,
  required: 30,
  industry: 15,
  industryUnknown: 5,
  salary: 10,
  salaryUnknown: 3,
  freshness: 10,
  followed: 8,
} as const;

const lower = (values: string[]): string[] =>
  values.map((value) => value.trim().toLowerCase()).filter(Boolean);

const upper = (values: string[]): string[] =>
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

const cityMatchSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND lower(ml."city") = ANY(:matchCities)
)`;

const countryMatchSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND upper(ml."country") = ANY(:matchCountries)
)`;

const hasLocationSql = `EXISTS (
  SELECT 1 FROM "job_posting_location" ml
  WHERE ml."jobPostingId" = job."id" AND (ml."city" <> '' OR ml."country" <> '')
)`;

const followedSql = `EXISTS (
  SELECT 1 FROM "company_watch" mw
  WHERE mw."companyId" = job."companyId" AND mw."userId" = :matchUserId
)`;

// A subquery rather than a join: these expressions are spliced into several
// different query builders, and only some of them join the company table.
const industryMatchSql = `EXISTS (
  SELECT 1 FROM "company" mc
  WHERE mc."id" = job."companyId" AND mc."industry" = ANY(:matchIndustries)
)`;

const industryKnownSql = `EXISTS (
  SELECT 1 FROM "company" mc
  WHERE mc."id" = job."companyId" AND mc."industry" IS NOT NULL
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
  const params: Record<string, unknown> = { matchUserId: userId };
  let max = 0;

  const weightFor = (criterion: MatchCriterion): number =>
    importanceOf(preference.weights, criterion);

  // What they want to work on is the strongest single signal a profile carries,
  // so it is weighted above everything else.
  const domains = preference.domains ?? [];
  const domainWeight = weightFor(MatchCriterion.DOMAIN);
  if (domains.length && domainWeight > 0) {
    params.matchDomains = domains;
    const hit = WEIGHTS.domain * domainWeight;
    const unknown = WEIGHTS.domainUnknown * domainWeight;
    parts.push(
      `CASE
         WHEN job."domain" = ANY(:matchDomains) THEN ${hit}
         WHEN job."domain" IS NULL THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
  }

  const seniorities = preference.seniorities ?? [];
  const seniorityWeight = weightFor(MatchCriterion.SENIORITY);
  if (seniorities.length && seniorityWeight > 0) {
    params.matchSeniorities = seniorities;
    const hit = WEIGHTS.seniority * seniorityWeight;
    const unknown = WEIGHTS.seniorityUnknown * seniorityWeight;
    parts.push(
      `CASE
         WHEN job."seniority" = ANY(:matchSeniorities) THEN ${hit}
         WHEN job."seniority" IS NULL THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
  }

  const motivationWeight = weightFor(MatchCriterion.MOTIVATION);
  const motivationQuery = keywordsToTsQuery(preference.motivations ?? []);
  if (motivationQuery && motivationWeight > 0) {
    params.matchMotivations = motivationQuery;
    const hit = WEIGHTS.motivation * motivationWeight;
    parts.push(
      `LEAST(${hit},
         ${hit} * ts_rank_cd(job."searchVector", to_tsquery('simple', :matchMotivations), 32) * 2
       )`,
    );
    max += hit;
  }

  // The CV is a weaker signal than a stated preference — it says what somebody
  // has done, not what they want next — so it ranks rather than decides.
  const resumeWeight = weightFor(MatchCriterion.RESUME);
  const resumeQuery = keywordsToTsQuery(preference.resumeKeywords ?? []);
  if (resumeQuery && resumeWeight > 0) {
    params.matchResume = resumeQuery;
    const hit = WEIGHTS.resume * resumeWeight;
    parts.push(
      `LEAST(${hit},
         ${hit} * ts_rank_cd(job."searchVector", to_tsquery('simple', :matchResume), 32) * 2
       )`,
    );
    max += hit;
  }

  const employmentTypes = preference.employmentTypes ?? [];
  const employmentWeight = weightFor(MatchCriterion.EMPLOYMENT_TYPE);
  if (employmentTypes.length && employmentWeight > 0) {
    params.matchTypes = employmentTypes;
    const hit = WEIGHTS.employmentType * employmentWeight;
    const unknown = WEIGHTS.employmentTypeUnknown * employmentWeight;
    parts.push(
      `CASE
         WHEN job."employmentType" = ANY(:matchTypes) THEN ${hit}
         WHEN job."employmentType" IS NULL THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
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
    const unknown = WEIGHTS.locationUnknown * locationWeight;
    // Somebody open to moving is not mismatched by an address, only less well
    // served than by the places they named.
    const elsewhere = preference.openToRelocation
      ? WEIGHTS.relocation * locationWeight
      : 0;
    parts.push(
      `CASE
         WHEN ${cities.length ? cityMatchSql : 'false'} THEN ${city}
         WHEN ${countries.length ? countryMatchSql : 'false'} THEN ${country}
         WHEN ${acceptsRemote ? `job."remoteType" = 'REMOTE'` : 'false'} THEN ${remote}
         WHEN NOT ${hasLocationSql} THEN ${unknown}
         ELSE ${elsewhere}
       END`,
    );
    max += city;
  }

  const remoteWeight = weightFor(MatchCriterion.REMOTE_TYPE);
  if (remoteTypes.length && remoteWeight > 0) {
    params.matchRemote = remoteTypes;
    const hit = WEIGHTS.remoteType * remoteWeight;
    const unknown = WEIGHTS.remoteTypeUnknown * remoteWeight;
    parts.push(
      `CASE
         WHEN job."remoteType" = ANY(:matchRemote) THEN ${hit}
         WHEN job."remoteType" IS NULL THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
  }

  // A title match is the closest thing to the user naming the job outright, so
  // it is checked against the title column instead of the whole document: a
  // description that merely mentions "data engineer" is not the same offer.
  const titleWeight = weightFor(MatchCriterion.TITLE);
  const titlePatterns = toLikePatterns(preference.titles ?? []);
  if (titlePatterns.length && titleWeight > 0) {
    params.matchTitles = titlePatterns;
    const hit = WEIGHTS.title * titleWeight;
    parts.push(
      `CASE WHEN lower(job."title") LIKE ANY(:matchTitles) THEN ${hit} ELSE 0 END`,
    );
    max += hit;
  }

  const keywordWeight = weightFor(MatchCriterion.KEYWORDS);
  const keywordQuery = keywordsToTsQuery(preference.keywords ?? []);
  if (keywordQuery && keywordWeight > 0) {
    params.matchKeywords = keywordQuery;
    const hit = WEIGHTS.keyword * keywordWeight;
    // `ts_rank_cd` with normalisation 32 lands in [0, 1), so this scales
    // cleanly and a long description cannot out-rank a matching title.
    parts.push(
      `LEAST(${hit},
         ${hit} * ts_rank_cd(job."searchVector", to_tsquery('simple', :matchKeywords), 32) * 2
       )`,
    );
    max += hit;
  }

  // Required terms score all or nothing, with no credit for a missing value:
  // "must mention" is a statement about the offer's text, and text is never
  // missing the way a structured field is.
  const requiredQuery = keywordsToRequiredTsQuery(
    preference.requiredKeywords ?? [],
  );
  if (requiredQuery) {
    params.matchRequired = requiredQuery;
    parts.push(
      `CASE
         WHEN job."searchVector" @@ to_tsquery('simple', :matchRequired) THEN ${WEIGHTS.required}
         ELSE 0
       END`,
    );
    max += WEIGHTS.required;
  }

  const industries = preference.industries ?? [];
  const industryWeight = weightFor(MatchCriterion.INDUSTRY);
  if (industries.length && industryWeight > 0) {
    params.matchIndustries = industries;
    const hit = WEIGHTS.industry * industryWeight;
    const unknown = WEIGHTS.industryUnknown * industryWeight;
    parts.push(
      `CASE
         WHEN ${industryMatchSql} THEN ${hit}
         WHEN NOT ${industryKnownSql} THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
  }

  const salaryWeight = weightFor(MatchCriterion.SALARY);
  if (preference.minSalary && salaryWeight > 0) {
    params.matchSalary = preference.minSalary;
    const hit = WEIGHTS.salary * salaryWeight;
    const unknown = WEIGHTS.salaryUnknown * salaryWeight;
    // Comparing 45000 EUR to 45000 CZK is worse than not comparing at all, so
    // an offer priced in another currency is treated as unpriced.
    const currency = preference.salaryCurrency?.trim().toUpperCase();
    const comparable = currency
      ? `(job."salaryCurrency" IS NULL OR upper(job."salaryCurrency") = :matchCurrency)`
      : 'true';
    if (currency) params.matchCurrency = currency;
    parts.push(
      `CASE
         WHEN ${comparable} AND (job."salaryMax" >= :matchSalary OR job."salaryMin" >= :matchSalary) THEN ${hit}
         WHEN job."salaryMax" IS NULL AND job."salaryMin" IS NULL THEN ${unknown}
         WHEN NOT ${comparable} THEN ${unknown}
         ELSE 0
       END`,
    );
    max += hit;
  }

  // Freshness decays rather than cuts off: an offer one day past the window is
  // not the same as one from last quarter, and neither should vanish.
  const freshnessWeight = weightFor(MatchCriterion.FRESHNESS);
  if (preference.maxAgeDays && freshnessWeight > 0) {
    params.matchMaxAge = preference.maxAgeDays;
    const hit = WEIGHTS.freshness * freshnessWeight;
    parts.push(
      `CASE
         WHEN job."postedAt" IS NULL THEN ${hit / 2}
         ELSE ${hit} * GREATEST(0, 1 - (
           EXTRACT(EPOCH FROM (now() - job."postedAt")) / 86400.0
         ) / (:matchMaxAge * 2.0))
       END`,
    );
    max += hit;
  }

  if (followsAny) {
    parts.push(`CASE WHEN ${followedSql} THEN ${WEIGHTS.followed} ELSE 0 END`);
    max += WEIGHTS.followed;
  }

  if (!parts.length || max <= 0) return null;

  return {
    score: `LEAST(100, GREATEST(0, round((${parts.join(' + ')}) * 100.0 / ${max})))::int`,
    params,
  };
};

export interface MatchPredicate {
  sql: string;
  params: Record<string, unknown>;
}

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

/** The always-on exclusions, independent of the "only matches" toggle. */
export const buildExclusionPredicate = (
  preference: JobPreference | null,
): MatchPredicate | null => {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  const query = keywordsToTsQuery(preference?.excludedKeywords ?? []);
  if (query) {
    clauses.push(
      `NOT (job."searchVector" @@ to_tsquery('simple', :excludedKeywords))`,
    );
    params.excludedKeywords = query;
  }

  const companies = preference?.excludedCompanyIds ?? [];
  if (companies.length) {
    clauses.push(`job."companyId" <> ALL(:excludedCompanies)`);
    params.excludedCompanies = companies;
  }

  if (!clauses.length) return null;
  return { sql: clauses.join(' AND '), params };
};

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
