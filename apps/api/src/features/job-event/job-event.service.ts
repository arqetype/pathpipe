import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEvent } from '@repo/db/entities/job-event';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingInteraction } from '@repo/db/entities/job-posting-interaction';
import {
  JobEventType,
  USER_RECORDABLE_EVENTS,
} from '@repo/db/types/job-event/type';
import { ApplicationStatus } from '@repo/db/types/application/status';

/**
 * The status a board column shows, translated back into the thing that
 * happened. Moving a card is a side effect of an event, not an event itself.
 *
 * WISHLIST is absent because it is the absence of news: putting a role on the
 * list is already recorded as APPLICATION_CREATED.
 */
export const EVENT_FOR_STATUS: Partial<
  Record<ApplicationStatus, JobEventType>
> = {
  [ApplicationStatus.APPLIED]: JobEventType.APPLICATION_SENT,
  [ApplicationStatus.INTERVIEW]: JobEventType.INTERVIEW_SCHEDULED,
  [ApplicationStatus.OFFER]: JobEventType.OFFER_RECEIVED,
  [ApplicationStatus.REJECTED]: JobEventType.REJECTION_RECEIVED,
  [ApplicationStatus.GHOSTED]: JobEventType.MARKED_GHOSTED,
};

export interface RecordEventInput {
  userId: string;
  type: JobEventType;
  /** Defaults to now. A user may date a follow-up they sent on Tuesday. */
  occurredAt?: Date;
  jobPostingId?: string | null;
  applicationId?: string | null;
  payload?: Record<string, unknown> | null;
}

/**
 * The frozen job description, as it read the day the application went out.
 */
export interface JobDescriptionSnapshot {
  jobPostingId: string;
  capturedAt: string;
  company: string | null;
  title: string;
  url: string;
  description: string | null;
  descriptionHtml: string | null;
  location: string | null;
  locations: Array<{ city: string; region: string; country: string }>;
  department: string | null;
  employmentType: string | null;
  remoteType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  postedAt: string | null;
  validThrough: string | null;
}

@Injectable()
export class JobEventService {
  constructor(
    @InjectRepository(JobEvent)
    private readonly eventRepository: Repository<JobEvent>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingInteraction)
    private readonly interactionRepository: Repository<JobPostingInteraction>,
  ) {}

  /**
   * Append one fact.
   *
   * Nothing here reads or updates an existing row, which is the point: the only
   * verb this table supports is INSERT.
   */
  async record(input: RecordEventInput): Promise<JobEvent> {
    return this.eventRepository.save(
      this.eventRepository.create({
        userId: input.userId,
        type: input.type,
        occurredAt: input.occurredAt ?? new Date(),
        jobPostingId: input.jobPostingId ?? null,
        applicationId: input.applicationId ?? null,
        payload: input.payload ?? null,
      }),
    );
  }

  /**
   * What a user is allowed to state happened.
   *
   * The body of a request is a claim, not a fact — POSTING_VIEWED and
   * APPLICATION_SENT are written by the code that performs those actions, and
   * accepting them from a caller would let anyone forge a snapshot or a history.
   */
  async recordUserEvent(
    userId: string,
    applicationId: string,
    type: JobEventType,
    occurredAt?: Date,
    note?: string,
  ): Promise<JobEvent> {
    if (!USER_RECORDABLE_EVENTS.includes(type)) {
      throw new ForbiddenException(`Event ${type} cannot be recorded by hand`);
    }
    return this.record({
      userId,
      applicationId,
      type,
      occurredAt,
      payload: note ? { note } : null,
    });
  }

  /**
   * Record that an application went out, freezing the description with it.
   *
   * The snapshot is taken once and only once. A card dragged back and forth
   * across the board records every crossing — those are real events — but the
   * description the user actually answered was the one on screen the first time,
   * and a later capture would quietly replace it with whatever the board has
   * edited it into since.
   */
  async recordApplicationSent(
    userId: string,
    applicationId: string,
    occurredAt?: Date,
  ): Promise<JobEvent> {
    const alreadySnapshotted = await this.eventRepository.exists({
      where: { applicationId, type: JobEventType.APPLICATION_SENT },
    });

    const snapshot = alreadySnapshotted
      ? null
      : await this.captureSnapshot(userId, applicationId);

    return this.record({
      userId,
      applicationId,
      type: JobEventType.APPLICATION_SENT,
      occurredAt,
      jobPostingId: snapshot?.jobPostingId ?? null,
      payload: snapshot ? { snapshot } : null,
    });
  }

  /**
   * The offer behind an application, copied out field by field.
   *
   * Returns null when the application was typed by hand rather than pushed from
   * an offer — there is nothing to freeze, and an empty snapshot would read as a
   * posting that said nothing.
   */
  private async captureSnapshot(
    userId: string,
    applicationId: string,
  ): Promise<JobDescriptionSnapshot | null> {
    const interaction = await this.interactionRepository.findOne({
      where: { applicationId, userId },
      select: { jobPostingId: true },
    });
    if (!interaction) return null;

    const posting = await this.jobPostingRepository.findOne({
      where: { id: interaction.jobPostingId },
      relations: ['company', 'locations'],
    });
    if (!posting) return null;

    return {
      jobPostingId: posting.id,
      capturedAt: new Date().toISOString(),
      company: posting.company?.name ?? null,
      title: posting.title,
      url: posting.url,
      description: posting.description,
      descriptionHtml: posting.descriptionHtml,
      location: posting.location,
      locations: (posting.locations ?? []).map((place) => ({
        city: place.city,
        region: place.region,
        country: place.country,
      })),
      department: posting.department,
      employmentType: posting.employmentType,
      remoteType: posting.remoteType,
      salaryMin: posting.salaryMin,
      salaryMax: posting.salaryMax,
      salaryCurrency: posting.salaryCurrency,
      postedAt: posting.postedAt?.toISOString() ?? null,
      validThrough: posting.validThrough?.toISOString() ?? null,
    };
  }

  /** Everything that happened to one application, oldest first. */
  async timelineForApplication(
    userId: string,
    applicationId: string,
  ): Promise<JobEvent[]> {
    return this.eventRepository.find({
      where: { userId, applicationId },
      order: { occurredAt: 'ASC', createdAt: 'ASC' },
    });
  }

  /** The description as it read when this application was sent. */
  async snapshotForApplication(
    userId: string,
    applicationId: string,
  ): Promise<JobDescriptionSnapshot | null> {
    const sent = await this.eventRepository.findOne({
      where: { userId, applicationId, type: JobEventType.APPLICATION_SENT },
      order: { occurredAt: 'ASC' },
    });
    return (
      (sent?.payload?.snapshot as JobDescriptionSnapshot | undefined) ?? null
    );
  }
}
