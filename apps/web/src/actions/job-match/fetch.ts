'use server';

import { get } from '@/lib/fetch';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';

export interface JobMatchItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobPostingStatus;
  source: string | null;
  postedAt: string | null;
  companyId: string;
  companyName: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchJobMatchesAction(
  status?: JobPostingStatus,
): Promise<JobMatchItem[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  const result = await get<JobMatchItem[]>(
    `/job-postings${qs ? `?${qs}` : ''}`,
  );
  if (!result.ok) throw new Error('Failed to fetch job matches');
  return result.data;
}

export async function countNewJobMatchesAction(): Promise<number> {
  const result = await get<{ count: number }>('/job-postings/count');
  if (!result.ok) return 0;
  return result.data.count;
}
