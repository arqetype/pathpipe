'use server';

import { get, postForm, put } from '@/lib/fetch';
import type { JobPreferenceResponse } from '@repo/db/query/job-preference';
import type { UpdateJobPreferenceDto } from '@repo/db/dto/job-preference/update-job-preference.dto';

const EMPTY: JobPreferenceResponse = {
  employmentTypes: [],
  remoteTypes: [],
  countries: [],
  cities: [],
  openToRelocation: false,
  domains: [],
  seniorities: [],
  industries: [],
  motivations: [],
  keywords: [],
  titles: [],
  requiredKeywords: [],
  resumeText: null,
  resumeKeywords: [],
  resumeUpdatedAt: null,
  excludedKeywords: [],
  excludedCompanies: [],
  minSalary: null,
  salaryCurrency: null,
  maxAgeDays: null,
  weights: {},
  notifyMatches: true,
  configured: false,
  completeness: 0,
};

export async function fetchJobPreferenceAction(): Promise<JobPreferenceResponse> {
  const result = await get<JobPreferenceResponse>('/job-preferences');
  // Not having a profile yet is a normal state, not a failure to report.
  if (!result.ok) return EMPTY;
  return result.data;
}

export async function updateJobPreferenceAction(
  dto: UpdateJobPreferenceDto,
): Promise<JobPreferenceResponse> {
  const result = await put<JobPreferenceResponse>('/job-preferences', dto);
  if (!result.ok) throw new Error('Failed to save your job profile');
  return result.data;
}

/**
 * Send a CV file for the API to read.
 *
 * Takes the `FormData` straight from the browser rather than a parsed file, so
 * the bytes are never copied through a serialisable action argument.
 */
export async function uploadResumeAction(
  formData: FormData,
): Promise<JobPreferenceResponse> {
  const result = await postForm<JobPreferenceResponse>(
    '/job-preferences/resume',
    formData,
  );
  if (!result.ok) {
    // The API's own wording is the useful part here — "no text in that file"
    // tells somebody what to do next, "upload failed" does not.
    const message = Array.isArray(result.data?.message)
      ? result.data.message[0]
      : result.data?.message;
    throw new Error(message || 'Could not read that file');
  }
  return result.data;
}
