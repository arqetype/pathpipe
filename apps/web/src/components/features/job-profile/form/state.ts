import type { Dispatch, SetStateAction } from 'react';
import type { CompanyIndustry } from '@repo/db/types/company/industry';
import type {
  MatchCriterion,
  MatchWeights,
} from '@repo/db/types/job-preference/importance';
import type {
  ExcludedCompany,
  JobPreferenceResponse,
} from '@repo/db/query/job-preference';

// Numbers held as the strings inputs produce.
export const toForm = (preference: JobPreferenceResponse) => ({
  employmentTypes: preference.employmentTypes,
  remoteTypes: preference.remoteTypes,
  domains: preference.domains,
  seniorities: preference.seniorities,
  industries: preference.industries as CompanyIndustry[],
  motivations: preference.motivations,
  resumeText: preference.resumeText ?? '',
  countries: preference.countries,
  cities: preference.cities,
  openToRelocation: preference.openToRelocation,
  keywords: preference.keywords,
  titles: preference.titles,
  requiredKeywords: preference.requiredKeywords,
  excludedKeywords: preference.excludedKeywords,
  excludedCompanies: preference.excludedCompanies as ExcludedCompany[],
  minSalary: preference.minSalary?.toString() ?? '',
  salaryCurrency: preference.salaryCurrency ?? '',
  maxAgeDays: preference.maxAgeDays?.toString() ?? '',
  weights: preference.weights as MatchWeights,
  notifyMatches: preference.notifyMatches,
});

export type JobProfileFormState = ReturnType<typeof toForm>;

export type SetJobProfileForm = Dispatch<SetStateAction<JobProfileFormState>>;

export const omit = (
  weights: MatchWeights,
  key: MatchCriterion,
): MatchWeights => {
  const next = { ...weights };
  delete next[key];
  return next;
};

export const toggle = <T>(list: T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
