import {
  ScoringPort,
  ScoredJob,
  CandidatePreferences,
} from '@/domain/ports/scoring.port';
import { User } from '@repo/db/entities/user';
import { RawJobListing } from '@repo/db/entities/raw-job-listing';

export class KeywordScoringAdapter implements ScoringPort {
  async scoreJob(
    candidate: User,
    job: RawJobListing,
    preferences: CandidatePreferences,
  ): Promise<ScoredJob> {
    const reasons: string[] = [];
    let score = 0;

    // Check keywords in position
    const positionLower = job.position.toLowerCase();
    for (const keyword of preferences.keywords) {
      if (positionLower.includes(keyword.toLowerCase())) {
        score += 10;
        reasons.push('Matched keyword: ' + keyword);
      }
    }

    // Check location match
    if (
      job.location &&
      preferences.locations.some((loc) =>
        job.location!.toLowerCase().includes(loc.toLowerCase()),
      )
    ) {
      score += 5;
      reasons.push('Location match');
    }

    // Check salary threshold
    if (
      preferences.minSalary &&
      job.salaryMin &&
      job.salaryMin >= preferences.minSalary
    ) {
      score += 5;
      reasons.push('Salary threshold met');
    }

    // Bonus for remote
    if (
      preferences.remoteOnly &&
      (positionLower.includes('remote') ||
        job.location?.toLowerCase().includes('remote'))
    ) {
      score += 3;
      reasons.push('Remote job');
    }

    return { job, score, reasons };
  }

  async scoreJobsForCandidate(
    candidate: User,
    jobs: RawJobListing[],
  ): Promise<ScoredJob[]> {
    // TODO: Fetch candidate preferences from database
    const preferences: CandidatePreferences = {
      keywords: [],
      locations: [],
      remoteOnly: false,
    };

    return Promise.all(
      jobs.map((job) => this.scoreJob(candidate, job, preferences)),
    );
  }
}
