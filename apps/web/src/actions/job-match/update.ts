'use server';

import { patch, post } from '@/lib/fetch';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { ApplicationStatus } from '@repo/db/types/application/status';
import type { JobPostingResponse } from '@repo/db/query/job-posting';

export async function updateJobMatchStatusAction(
  id: string,
  status: JobPostingStatus,
): Promise<void> {
  const result = await patch(`/job-postings/${id}/status`, { status });
  if (!result.ok) throw new Error('Failed to update job match status');
}

export async function setJobMatchSavedAction(
  id: string,
  saved: boolean,
): Promise<JobPostingResponse> {
  const result = await patch<JobPostingResponse>(`/job-postings/${id}/saved`, {
    saved,
  });
  if (!result.ok) throw new Error('Failed to update saved state');
  return result.data;
}

/**
 * Pushes an offer onto the applications board.
 *
 * Returns the application it landed on, whether it was created now or on an
 * earlier click, so the caller can link straight to it.
 */
export async function trackJobMatchAction(
  id: string,
  status: ApplicationStatus = ApplicationStatus.WISHLIST,
): Promise<{ applicationId: string; created: boolean }> {
  const result = await post<{ applicationId: string; created: boolean }>(
    `/job-postings/${id}/application`,
    { status },
  );
  if (!result.ok) throw new Error('Failed to add the offer to your board');
  return result.data;
}
