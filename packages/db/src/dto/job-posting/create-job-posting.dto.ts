export class CreateJobPostingDto {
  title: string;
  url: string;
  description?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  source?: string | null;
  postedAt?: string | null;
  companyId: string;
  userId: string;
}
