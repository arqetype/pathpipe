import {
  JobDiscoveryPort,
  JobFilters,
} from '@/domain/ports/job-discovery.port';
import {
  RawJobListing,
  JobListingSource,
} from '@repo/db/entities/raw-job-listing';

const ARBEITNOW_API = 'https://www.arbeitnow.com/api/job-board-api';

interface ArbeitnowJobDto {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data: ArbeitnowJobDto[];
}

export class ArbeitnowDiscoveryAdapter implements JobDiscoveryPort {
  readonly sourceName = 'arbeitnow';

  async discoverJobs(_filters?: JobFilters): Promise<RawJobListing[]> {
    const res = await fetch(ARBEITNOW_API);
    if (!res.ok) {
      throw new Error('Arbeitnow API error: ' + res.status);
    }
    const body = (await res.json()) as ArbeitnowResponse;
    return body.data.map((dto) => this.mapDtoToEntity(dto));
  }

  async getJobDetails(_externalId: string): Promise<RawJobListing> {
    const jobs = await this.discoverJobs();
    const job = jobs.find((j) => j.externalId === _externalId);
    if (!job) throw new Error('Job not found: ' + _externalId);
    return job;
  }

  private mapDtoToEntity(dto: ArbeitnowJobDto): RawJobListing {
    const entity = new RawJobListing();
    entity.source = JobListingSource.ARBEITNOW;
    entity.externalId = dto.slug;
    entity.companyName = dto.company_name;
    entity.position = dto.title;
    entity.description = dto.description;
    entity.url = dto.url;
    entity.location = dto.location ?? '';
    entity.rawData = {
      remote: dto.remote,
      tags: dto.tags,
      jobTypes: dto.job_types,
    } as Record<string, unknown>;
    entity.postedAt = new Date(dto.created_at * 1000);
    return entity;
  }
}
