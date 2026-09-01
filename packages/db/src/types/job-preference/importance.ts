/**
 * How much one criterion counts in the match score.
 *
 * A profile is a set of wishes of unequal strength: somebody who will move
 * anywhere for the right domain and somebody who cannot leave their city both
 * fill in the same fields, and only this tells them apart. The scale is
 * deliberately short — four steps a person can reason about, not a slider whose
 * middle nobody can justify.
 */
export enum MatchImportance {
  /** Do not score this criterion at all, even though it is filled in. */
  IGNORED = 'IGNORED',
  NICE_TO_HAVE = 'NICE_TO_HAVE',
  NORMAL = 'NORMAL',
  ESSENTIAL = 'ESSENTIAL',
}

/** The criteria a user can weigh. Anything absent scores at `NORMAL`. */
export enum MatchCriterion {
  DOMAIN = 'DOMAIN',
  SENIORITY = 'SENIORITY',
  EMPLOYMENT_TYPE = 'EMPLOYMENT_TYPE',
  LOCATION = 'LOCATION',
  REMOTE_TYPE = 'REMOTE_TYPE',
  TITLE = 'TITLE',
  KEYWORDS = 'KEYWORDS',
  MOTIVATION = 'MOTIVATION',
  RESUME = 'RESUME',
  INDUSTRY = 'INDUSTRY',
  SALARY = 'SALARY',
  FRESHNESS = 'FRESHNESS',
}

/** Per-criterion importance. Missing keys mean `NORMAL`. */
export type MatchWeights = Partial<Record<MatchCriterion, MatchImportance>>;

export const IMPORTANCE_MULTIPLIER: Record<MatchImportance, number> = {
  [MatchImportance.IGNORED]: 0,
  [MatchImportance.NICE_TO_HAVE]: 0.5,
  [MatchImportance.NORMAL]: 1,
  [MatchImportance.ESSENTIAL]: 2,
};

/**
 * The multiplier for one criterion, defaulting to `NORMAL`.
 *
 * Reads a plain object rather than a validated map because it also runs over
 * whatever jsonb the database happens to hold: a key written by an older
 * version of the app must not break scoring for everybody.
 */
export const importanceOf = (
  weights: MatchWeights | null | undefined,
  criterion: MatchCriterion,
): number => {
  const level = weights?.[criterion];
  return level && level in IMPORTANCE_MULTIPLIER
    ? IMPORTANCE_MULTIPLIER[level]
    : 1;
};
