import { JobPreference } from '@repo/db/entities/job-preference';
import { keywordsToTsQuery, type MatchPredicate } from './shared';

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
