import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { JobPostingResponse } from '@repo/db/query/job-posting';

export interface BatchCreateResult {
  inserted: number;
  total: number;
}

@Injectable()
export class JobPostingService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
  ) {}

  async createBatch(dtos: CreateJobPostingDto[]): Promise<BatchCreateResult> {
    let inserted = 0;
    for (const dto of dtos) {
      try {
        await this.jobPostingRepository.insert({
          title: dto.title,
          url: dto.url,
          description: dto.description ?? null,
          location: dto.location ?? null,
          salaryMin: dto.salaryMin ?? null,
          salaryMax: dto.salaryMax ?? null,
          source: dto.source ?? null,
          postedAt: dto.postedAt ? new Date(dto.postedAt) : null,
          company: { id: dto.companyId },
          user: { id: dto.userId },
        });
        inserted++;
      } catch (err) {
        if (!this.isUniqueViolation(err)) throw err;
      }
    }
    return { inserted, total: dtos.length };
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
