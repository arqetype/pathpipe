export class CreateJobPostingDto {
  title: string;
  url: string;
  /** Stable id from the source ATS, when it exposes one. */
  externalId?: string | null;
  description?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  source?: string | null;
  postedAt?: string | null;
  companyId: string;
  userId: string;
}
