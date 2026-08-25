export type JobAlertJob = {
  type: 'new-job-alert';
  to: string;
  userName: string;
  companyName: string;
  companyId: string;
  jobCount: number;
  jobs: Array<{ title: string; url: string; location?: string }>;
};

export const newJobAlert = (data: {
  to: string;
  userName: string;
  companyName: string;
  companyId: string;
  jobCount: number;
  jobs: Array<{ title: string; url: string; location?: string }>;
}): JobAlertJob => ({ type: 'new-job-alert', ...data });
