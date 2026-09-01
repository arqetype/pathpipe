/** One offer in a digest, with the company it belongs to. */
export type JobAlertOffer = {
  title: string;
  url: string;
  companyName: string;
  location?: string;
  /** 0–100 against the recipient's profile, when they have one. */
  matchScore?: number;
};

export type JobAlertJob = {
  type: 'new-job-alert';
  to: string;
  userName: string;
  /** Offers matched across every company, not only one. */
  jobCount: number;
  jobs: JobAlertOffer[];
};

export const newJobAlert = (data: {
  to: string;
  userName: string;
  jobCount: number;
  jobs: JobAlertOffer[];
}): JobAlertJob => ({ type: 'new-job-alert', ...data });
