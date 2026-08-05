import { fetchJobMatchesAction, countNewJobMatchesAction } from '@/actions/job-match/fetch';
import { JobMatchList } from '@/components/features/job-matches/list';

export default async function JobMatchesPage() {
  const [jobs, newCount] = await Promise.all([
    fetchJobMatchesAction(),
    countNewJobMatchesAction(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Job Matches</h1>
        {newCount > 0 && (
          <p className="text-muted-foreground">
            You have <span className="font-semibold text-foreground">{newCount}</span> new job
            offer{newCount > 1 ? 's' : ''} matching your profile
          </p>
        )}
      </div>
      <JobMatchList jobs={jobs} />
    </div>
  );
}
