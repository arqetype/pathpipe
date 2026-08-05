import { TriggerDiscovery } from '@/components/features/discover/trigger-discovery';

export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Discovery</h1>
        <p className="text-muted-foreground">
          Manually trigger the ATS worker to discover new job postings from watched companies.
        </p>
      </div>
      <TriggerDiscovery />
    </div>
  );
}