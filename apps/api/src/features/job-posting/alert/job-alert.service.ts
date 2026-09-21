import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPreference } from '@repo/db/entities/job-preference';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { STRONG_FIT_SCORE } from '@repo/db/query/job-posting';
import type { JobAlertJob, JobAlertOffer } from '@repo/queues/job-alert';
import { buildExclusionPredicate } from '../match/exclusion';
import { buildMatchPredicate } from '../match/predicate';
import { buildMatchSql } from '../match/score';
import { isConfigured } from '../match/shared';

const MAX_OFFERS_PER_DIGEST = 10;

const FIRST_DIGEST_WINDOW_DAYS = 3;

const MIN_SCORE = STRONG_FIT_SCORE;

@Injectable()
export class JobAlertService {
  private readonly logger = new Logger(JobAlertService.name);

  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPreference)
    private readonly preferenceRepository: Repository<JobPreference>,
    @InjectRepository(JobPostingLocation)
    private readonly locationRepository: Repository<JobPostingLocation>,
    @Inject('JOB_ALERT_QUEUE')
    private readonly alertQueue: Queue<JobAlertJob>,
  ) {}

  async notifyMatches(): Promise<{ notified: number; offers: number }> {
    const preferences = await this.preferenceRepository.find({
      where: { notifyMatches: true },
      relations: ['user'],
    });

    let notified = 0;
    let offers = 0;

    for (const preference of preferences) {
      if (!isConfigured(preference) || !preference.user?.email) continue;

      const since =
        preference.lastNotifiedAt ??
        new Date(Date.now() - FIRST_DIGEST_WINDOW_DAYS * 86_400_000);

      const matches = await this.findMatches(preference, since);
      if (!matches.length) continue;

      await this.alertQueue.add('new-job-alert', {
        type: 'new-job-alert',
        to: preference.user.email,
        userName: preference.user.name ?? preference.user.email,
        jobCount: matches.length,
        jobs: matches,
      });

      preference.lastNotifiedAt = new Date();
      await this.preferenceRepository.save(preference);

      notified += 1;
      offers += matches.length;
    }

    if (notified) {
      this.logger.log(`Queued ${notified} digests covering ${offers} offers`);
    }
    return { notified, offers };
  }

  private async findMatches(
    preference: JobPreference,
    since: Date,
  ): Promise<JobAlertOffer[]> {
    const match = buildMatchSql(preference.userId, {
      preference,
      followsAny: true,
    });
    if (!match) return [];

    const qb = this.jobPostingRepository
      .createQueryBuilder('job')
      .innerJoin('job.company', 'company')
      .select('job.id', 'id')
      .addSelect('job.title', 'title')
      .addSelect('job.url', 'url')
      .addSelect('job.location', 'location')
      .addSelect('company.name', 'companyName')
      .addSelect(match.score, 'match_score')
      .where('job.closedAt IS NULL')
      .andWhere('job.createdAt > :since', { since })
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM "job_posting_interaction" i
           WHERE i."jobPostingId" = job.id AND i."userId" = :userId
         )`,
        { userId: preference.userId },
      )
      .setParameters(match.params)
      .orderBy('match_score', 'DESC')
      .addOrderBy('job.createdAt', 'DESC')
      .limit(MAX_OFFERS_PER_DIGEST);

    const predicate = buildMatchPredicate(preference);
    if (predicate) qb.andWhere(`(${predicate.sql})`, predicate.params);

    const exclusion = buildExclusionPredicate(preference);
    if (exclusion) qb.andWhere(exclusion.sql, exclusion.params);

    const rows = await qb.getRawMany<{
      id: string;
      title: string;
      url: string;
      location: string | null;
      companyName: string;
      match_score: number;
    }>();

    return rows
      .filter((row) => row.match_score >= MIN_SCORE)
      .map((row) => ({
        title: row.title,
        url: row.url,
        companyName: row.companyName,
        location: row.location ?? undefined,
        matchScore: row.match_score,
      }));
  }
}
