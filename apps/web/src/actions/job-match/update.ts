'use server';

import { patch, del } from '@/lib/fetch';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';

export async function updateJobMatchStatusAction(id: string, status: JobPostingStatus): Promise<void> {
  const result = await patch(`/job-postings/${id}/status`, { status });
  if (!result.ok) throw new Error('Failed to update job match status');
}

export async function deleteJobMatchAction(id: string): Promise<void> {
  const result = await del(`/job-postings/${id}`, {});
  if (!result.ok) throw new Error('Failed to delete job match');
}
