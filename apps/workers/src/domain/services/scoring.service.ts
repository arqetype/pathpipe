import { ScoringPort, ScoredJob } from '../ports/scoring.port';
import { User } from '@repo/db/entities/user';
import { RawJobListing } from '@repo/db/entities/raw-job-listing';

export class ScoringService {
  constructor(private readonly scoringAdapter: ScoringPort) {}

  async scoreAllActiveCandidates(): Promise<Map<string, ScoredJob[]>> {
    // TODO: Fetch active candidates and score jobs for each
    console.log('Scoring: scoring for all active candidates');
    return new Map();
  }

  async scoreCandidates(
    candidateId?: string,
  ): Promise<Map<string, ScoredJob[]>> {
    // TODO: Fetch candidates and score jobs
    console.log('Scoring: scoring for candidate', candidateId);
    return new Map();
  }

  async scoreJobsForCandidate(
    candidate: User,
    jobs: RawJobListing[],
  ): Promise<ScoredJob[]> {
    return this.scoringAdapter.scoreJobsForCandidate(candidate, jobs);
  }
}
