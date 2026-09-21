import { CompanyIndustry } from '../types/company/industry';
import { EmploymentType } from '../types/job-posting/employment-type';
import { RemoteType } from '../types/job-posting/remote-type';
import { SeniorityLevel, WorkDomain } from '../types/job-posting/work-domain';
import type { MatchWeights } from '../types/job-preference/importance';

/** An excluded company, with the name needed to show it back to the user. */
export interface ExcludedCompany {
  id: string;
  name: string;
}

export interface JobPreferenceResponse {
  employmentTypes: EmploymentType[];
  remoteTypes: RemoteType[];
  countries: string[];
  cities: string[];
  openToRelocation: boolean;
  domains: WorkDomain[];
  seniorities: SeniorityLevel[];
  industries: CompanyIndustry[];
  motivations: string[];
  keywords: string[];
  titles: string[];
  requiredKeywords: string[];
  resumeText: string | null;
  /** What we read out of the CV — shown back so the user can correct it. */
  resumeKeywords: string[];
  resumeUpdatedAt: string | null;
  excludedKeywords: string[];
  excludedCompanies: ExcludedCompany[];
  minSalary: number | null;
  salaryCurrency: string | null;
  maxAgeDays: number | null;
  weights: MatchWeights;
  notifyMatches: boolean;
  /** False until the user saves something — the board uses it to prompt. */
  configured: boolean;
  /**
   * How much of the profile carries a signal, 0–100.
   *
   * Shown rather than computed in the browser so the number cannot drift from
   * what the scorer actually reads.
   */
  completeness: number;
}

/** What filling the profile from a CV changed, so the UI can say it plainly. */
export interface ResumeProfileApplied {
  preference: JobPreferenceResponse;
  /** Names of the fields that were empty and have just been filled. */
  filled: string[];
  /**
   * Fields the CV had an answer for that were left alone because the user had
   * already answered them — shown so nothing looks silently ignored.
   */
  skipped: string[];
}
