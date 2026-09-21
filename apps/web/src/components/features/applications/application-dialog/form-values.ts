import type { ApplicationStatus } from '@repo/db/types/application/status';
import type { ApplicationTier } from '@repo/db/types/application/tier';

export type FormValues = {
  position: string;
  companyName: string;
  status: ApplicationStatus;
  tier: ApplicationTier;
  appliedAt: string;
  url: string;
  city: string;
  country: string;
  salaryMin: string;
  salaryMax: string;
  contactName: string;
  contactEmail: string;
  notes: string;
  resumeFileId: string | null;
  coverLetterFileId: string | null;
};
