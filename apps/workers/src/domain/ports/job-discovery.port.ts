import { RawJobListing } from '@repo/db/entities/raw-job-listing';

export interface JobFilters {
  keywords?: string[];
  location?: string;
  remote?: boolean;
  postedAfter?: Date;
}

export interface JobDiscoveryPort {
  discoverJobs(filters?: JobFilters): Promise<RawJobListing[]>;
  getJobDetails(externalId: string): Promise<RawJobListing>;
  readonly sourceName: string;
}
