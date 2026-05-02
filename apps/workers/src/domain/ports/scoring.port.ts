import { User } from '@repo/db/entities/user';
import { RawJobListing } from '@repo/db/entities/raw-job-listing';

export interface ScoredJob {
  job: RawJobListing;
  score: number;
  reasons: string[];
}

export interface CandidatePreferences {
  keywords: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary?: number;
}

export interface ScoringPort {
  scoreJob(
    candidate: User,
    job: RawJobListing,
    preferences: CandidatePreferences,
  ): Promise<ScoredJob>;
  scoreJobsForCandidate(
    candidate: User,
    jobs: RawJobListing[],
  ): Promise<ScoredJob[]>;
}
