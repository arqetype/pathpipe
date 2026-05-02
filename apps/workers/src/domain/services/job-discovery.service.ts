import { JobDiscoveryPort, JobFilters } from '../ports/job-discovery.port';
import { RawJobListing } from '@repo/db/entities/raw-job-listing';

export class JobDiscoveryService {
  private readonly adapters: JobDiscoveryPort[] = [];

  constructor(adapters: JobDiscoveryPort[] = []) {
    this.adapters = adapters;
  }

  registerAdapter(adapter: JobDiscoveryPort) {
    this.adapters.push(adapter);
  }

  async discoverFromAllSources(filters?: JobFilters): Promise<RawJobListing[]> {
    const results = await Promise.all(
      this.adapters.map((adapter) => adapter.discoverJobs(filters)),
    );
    return results.flat();
  }

  async getJobDetails(
    sourceName: string,
    externalId: string,
  ): Promise<RawJobListing | null> {
    const adapter = this.adapters.find((a) => a.sourceName === sourceName);
    if (!adapter) return null;
    return adapter.getJobDetails(externalId);
  }
}
