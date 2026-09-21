import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingInteraction } from '@repo/db/entities/job-posting-interaction';
import { Application } from '@repo/db/entities/application';
import { User } from '@repo/db/entities/user';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { ApplicationStatus } from '@repo/db/types/application/status';
import type { JobPostingResponse } from '@repo/db/query/job-posting';
import { JobPostingService } from './job-posting.service';

/** What the viewer did with an offer: seen, saved, or pushed onto the board. */
@Injectable()
export class JobPostingInteractionService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingInteraction)
    private readonly interactionRepository: Repository<JobPostingInteraction>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly jobPostingService: JobPostingService,
  ) {}

  /**
   * Creates or updates the viewer's row for one offer.
   *
   * Every user action lands here, so the "no row means untouched" rule has
   * exactly one place that breaks it.
   */
  private async upsertInteraction(
    userId: string,
    jobPostingId: string,
    patch: Partial<JobPostingInteraction>,
  ): Promise<JobPostingInteraction> {
    const exists = await this.jobPostingRepository.findOne({
      where: { id: jobPostingId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Job posting not found');

    const current = await this.interactionRepository.findOne({
      where: { userId, jobPostingId },
    });

    if (current) {
      Object.assign(current, patch);
      return this.interactionRepository.save(current);
    }

    return this.interactionRepository.save(
      this.interactionRepository.create({
        userId,
        jobPostingId,
        status: JobPostingStatus.SEEN,
        ...patch,
      }),
    );
  }

  async markAs(
    userId: string,
    jobId: string,
    status: JobPostingStatus,
  ): Promise<void> {
    await this.upsertInteraction(userId, jobId, { status });
  }

  async setSaved(
    userId: string,
    jobId: string,
    saved: boolean,
  ): Promise<JobPostingResponse> {
    await this.upsertInteraction(userId, jobId, {
      saved,
      savedAt: saved ? new Date() : null,
    });
    return this.jobPostingService.findOne(userId, jobId);
  }

  /**
   * Pushes an offer onto the user's applications board.
   *
   * The link is kept on the interaction so the board can show it as tracked,
   * and so a second click reuses the application instead of duplicating it.
   */
  async trackAsApplication(
    user: User,
    jobId: string,
    status: ApplicationStatus = ApplicationStatus.WISHLIST,
  ): Promise<{ applicationId: string; created: boolean }> {
    const job = await this.jobPostingRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });
    if (!job) throw new NotFoundException('Job posting not found');

    const existingInteraction = await this.interactionRepository.findOne({
      where: { userId: user.id, jobPostingId: jobId },
    });

    if (existingInteraction?.applicationId) {
      const existing = await this.applicationRepository.findOne({
        where: { id: existingInteraction.applicationId },
      });
      if (existing) return { applicationId: existing.id, created: false };
    }

    const application = this.applicationRepository.create({
      position: job.title,
      company: job.company,
      url: job.url,
      salaryMin: job.salaryMin ?? undefined,
      salaryMax: job.salaryMax ?? undefined,
      status,
      notes: job.location ? `Location: ${job.location}` : undefined,
      user,
      ...(status === ApplicationStatus.APPLIED
        ? { appliedAt: new Date() }
        : {}),
    });
    const saved = await this.applicationRepository.save(application);

    await this.upsertInteraction(user.id, jobId, {
      applicationId: saved.id,
      status:
        status === ApplicationStatus.APPLIED
          ? JobPostingStatus.APPLIED
          : (existingInteraction?.status ?? JobPostingStatus.SEEN),
    });

    return { applicationId: saved.id, created: true };
  }
}
