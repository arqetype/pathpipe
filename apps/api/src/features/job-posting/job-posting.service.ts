import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { JobPostingResponse } from '@repo/db/query/job-posting';

export interface InsertedJobSummary {
  id: string;
  title: string;
  url: string;
  location: string | null;
}

/** Rows per INSERT. 11 columns per row keeps this far below the 65535 cap. */
const BATCH_CHUNK_SIZE = 200;

export interface BatchCreateResult {
  inserted: number;
  total: number;
  /**
   * The rows that were actually new. Alert emails are built from this, so they
   * can never claim a posting the user has already seen.
   */
  jobs: InsertedJobSummary[];
}

@Injectable()
export class JobPostingService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
  ) {}

  async createBatch(dtos: CreateJobPostingDto[]): Promise<BatchCreateResult> {
    if (!dtos.length) return { inserted: 0, total: 0, jobs: [] };

    const rows = dtos.map((dto) => this.toRow(dto));
    const jobs: InsertedJobSummary[] = [];

    // Chunked so a large board stays well under Postgres' bind-parameter limit.
    for (let start = 0; start < rows.length; start += BATCH_CHUNK_SIZE) {
      const chunk = rows.slice(start, start + BATCH_CHUNK_SIZE);
      jobs.push(...(await this.insertChunk(chunk)));
    }

    return { inserted: jobs.length, total: dtos.length, jobs };
  }

  /**
   * One statement with ON CONFLICT DO NOTHING: the returned rows are exactly
   * the postings that did not exist yet, whichever unique constraint would have
   * caught them (the URL, or the ATS id for boards that rewrite their slugs).
   */
  private async insertChunk(
    chunk: QueryDeepPartialEntity<JobPosting>[],
  ): Promise<InsertedJobSummary[]> {
    try {
      const result = await this.jobPostingRepository
        .createQueryBuilder()
        .insert()
        .into(JobPosting)
        .values(chunk)
        .orIgnore()
        .returning(['id', 'title', 'url', 'location'])
        .execute();

      return (result.raw as InsertedJobSummary[]) ?? [];
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
      const fallback = await this.createBatchRowByRow(chunk, chunk.length);
      return fallback.jobs;
    }
  }

  /** Fallback for the rare case the bulk statement is rejected. */
  private async createBatchRowByRow(
    rows: QueryDeepPartialEntity<JobPosting>[],
    total: number,
  ): Promise<BatchCreateResult> {
    const jobs: InsertedJobSummary[] = [];
    for (const row of rows) {
      try {
        const result = await this.jobPostingRepository.insert(row);
        const identifier = result.identifiers[0];
        if (identifier?.id) {
          jobs.push({
            id: String(identifier.id),
            title: String(row.title),
            url: String(row.url),
            location: (row.location as string | null) ?? null,
          });
        }
      } catch (err) {
        if (!this.isUniqueViolation(err)) throw err;
      }
    }
    return { inserted: jobs.length, total, jobs };
  }

  private toRow(dto: CreateJobPostingDto): QueryDeepPartialEntity<JobPosting> {
    return {
      title: dto.title,
      url: dto.url,
      externalId: dto.externalId ?? null,
      description: dto.description ?? null,
      location: dto.location ?? null,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      source: dto.source ?? null,
      postedAt: dto.postedAt ? new Date(dto.postedAt) : null,
      companyId: dto.companyId,
      userId: dto.userId,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === '23505'
    );
  }

  async findByUser(
    userId: string,
    status?: JobPostingStatus,
  ): Promise<JobPostingResponse[]> {
    const where: Record<string, unknown> = { user: { id: userId } };
    if (status) where['status'] = status;
    const jobs = await this.jobPostingRepository.find({
      where,
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return jobs.map((job) => this.toResponse(job));
  }

  async countNew(userId: string): Promise<number> {
    return this.jobPostingRepository.count({
      where: { user: { id: userId }, status: JobPostingStatus.NEW },
    });
  }

  async markAs(
    userId: string,
    jobId: string,
    status: JobPostingStatus,
  ): Promise<void> {
    await this.jobPostingRepository.update(
      { id: jobId, user: { id: userId } },
      { status },
    );
  }

  async delete(userId: string, jobId: string): Promise<void> {
    await this.jobPostingRepository.delete({
      id: jobId,
      user: { id: userId },
    });
  }

  private toResponse(job: JobPosting): JobPostingResponse {
    return {
      id: job.id,
      title: job.title,
      url: job.url,
      description: job.description,
      location: job.location,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      status: job.status,
      source: job.source,
      postedAt: job.postedAt?.toISOString() ?? null,
      companyId: job.companyId,
      companyName: job.company.name,
      userId: job.userId,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
