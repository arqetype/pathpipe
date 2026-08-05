import { JobPostingStatus } from '../types/job-posting/status';

export interface JobPostingQuery {
  userId?: string;
  status?: JobPostingStatus;
  companyId?: string;
}

export interface JobPostingResponse {
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
