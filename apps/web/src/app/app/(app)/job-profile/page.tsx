import { fetchJobPreferenceAction } from '@/actions/job-preference';
import { JobProfileForm } from '@/components/features/job-profile/form';

export default async function JobProfilePage() {
  const preference = await fetchJobPreferenceAction();

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <div className="flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Job profile</h1>
          <p className="text-sm text-muted-foreground">
            What you are looking for. Every offer on the board is scored against
            this, and nothing is hidden unless you ask for it.
          </p>
        </div>
        <JobProfileForm preference={preference} />
      </div>
    </div>
  );
}
