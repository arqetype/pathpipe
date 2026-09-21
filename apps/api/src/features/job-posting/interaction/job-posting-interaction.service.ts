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
import { JobEventType } from '@repo/db/types/job-event/type';
import { JobPostingService } from '../job-posting.service';
import { JobEventService } from '../../job-event/job-event.service';

/**
 * The board's statuses, as the events behind them.
 *
 * NEW and APPLIED are absent: NEW is a user undoing a mark, which is the one
 * thing that is not news, and APPLIED is reached through the applications board
 * — where the description gets frozen — never by marking an offer.
 */
const EVENT_FOR_POSTING_STATUS: Partial<
  Record<JobPostingStatus, JobEventType>
> = {
  [JobPostingStatus.SEEN]: JobEventType.POSTING_VIEWED,
  [JobPostingStatus.DISMISSED]: JobEventType.POSTING_DISMISSED,
};

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
    private readonly jobEventService: JobEventService,
  ) {}

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

  // ponytail: one event per explicit mark, which is what the board sends — it
  // does not report a status on every render. Collapse repeats into the day
  // they happened if that ever stops being true.
  async markAs(
    userId: string,
    jobId: string,
    status: JobPostingStatus,
  ): Promise<void> {
    await this.upsertInteraction(userId, jobId, { status });

    const type = EVENT_FOR_POSTING_STATUS[status];
    if (type) {
      await this.jobEventService.record({ userId, type, jobPostingId: jobId });
    }
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
    await this.jobEventService.record({
      userId,
      type: saved ? JobEventType.POSTING_SAVED : JobEventType.POSTING_UNSAVED,
      jobPostingId: jobId,
    });
    return this.jobPostingService.findOne(userId, jobId);
  }

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

    // Before the events below, and deliberately: the snapshot finds the offer
    // behind an application through this link, so an APPLICATION_SENT written
    // first would freeze nothing.
    await this.upsertInteraction(user.id, jobId, {
      applicationId: saved.id,
      status:
        status === ApplicationStatus.APPLIED
          ? JobPostingStatus.APPLIED
          : (existingInteraction?.status ?? JobPostingStatus.SEEN),
    });

    await this.jobEventService.record({
      userId: user.id,
      type: JobEventType.APPLICATION_CREATED,
      jobPostingId: jobId,
      applicationId: saved.id,
    });

    if (status === ApplicationStatus.APPLIED) {
      await this.jobEventService.recordApplicationSent(user.id, saved.id);
    }

    return { applicationId: saved.id, created: true };
  }
}
