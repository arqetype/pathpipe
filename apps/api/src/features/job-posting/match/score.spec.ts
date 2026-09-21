import { JobPreference } from '@repo/db/entities/job-preference';
import { EmploymentType } from '@repo/db/types/job-posting/employment-type';
import {
  MatchCriterion,
  MatchImportance,
} from '@repo/db/types/job-preference/importance';
import { buildMatchSql } from './score';
import { keywordsToRequiredTsQuery, keywordsToTsQuery } from './shared';

describe('match scoring', () => {
  const profile = (over: Partial<JobPreference> = {}): JobPreference =>
    ({
      employmentTypes: [EmploymentType.INTERNSHIP],
      weights: { [MatchCriterion.EMPLOYMENT_TYPE]: MatchImportance.ESSENTIAL },
      ...over,
    }) as JobPreference;

  const sqlFor = (preference: JobPreference): string =>
    buildMatchSql('user-1', { preference, followsAny: false }).score;

  it('requires the whole word, so "intern" does not match "internal"', () => {
    expect(keywordsToRequiredTsQuery(['intern'])).toBe(`'intern'`);
    expect(keywordsToTsQuery(['intern'])).toBe(`'intern':*`);
  });

  it('caps an offer that contradicts an essential criterion', () => {
    expect(sqlFor(profile())).toContain('THEN 69');
  });

  it('leaves a merely wished-for criterion uncapped', () => {
    const wish = profile({
      weights: { [MatchCriterion.EMPLOYMENT_TYPE]: MatchImportance.NORMAL },
    });
    expect(sqlFor(wish)).not.toContain('THEN 69');
  });

  it('scores an offer that says nothing at 0 rather than at the ceiling', () => {
    expect(sqlFor(profile())).toMatch(
      /LEAST\(100, CASE.*GREATEST\(0, COALESCE/s,
    );
  });
});
