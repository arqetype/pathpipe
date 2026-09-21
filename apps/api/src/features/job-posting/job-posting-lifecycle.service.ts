import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingClosedReason } from '@repo/db/types/job-posting/closed-reason';
import { ReconcileJobPostingsDto } from '@repo/db/dto/job-posting/reconcile-job-postings.dto';
import { JobPostingValidityDto } from '@repo/db/dto/job-posting/job-posting-validity.dto';

/** One offer's URL, for the worker's validity probe. */
export interface StalePostingSummary {
  id: string;
  url: string;
}

/** Whether an offer is still on its board, and closing it when it is not. */
@Injectable()
export class JobPostingLifecycleService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
  ) {}

  /**
   * Closes the offers a board no longer lists.
   *
   * Called only after a complete crawl of one source: the caller is asserting
   * "these are all the offers that exist there right now", which is the only
   * evidence strong enough to take an offer off the board.
   */
  async reconcile(dto: ReconcileJobPostingsDto): Promise<{ closed: number }> {
    const urls = dto.urls ?? [];
    const externalIds = dto.externalIds ?? [];
    if (!urls.length && !externalIds.length) return { closed: 0 };

    const qb = this.jobPostingRepository
      .createQueryBuilder()
      .update(JobPosting)
      .set({
        closedAt: () => 'now()',
        closedReason: JobPostingClosedReason.REMOVED_FROM_LISTING,
      })
      .where('"companyId" = :companyId', { companyId: dto.companyId })
      .andWhere('"source" = :source', { source: dto.source })
      .andWhere('"closedAt" IS NULL');

    if (urls.length) {
      qb.andWhere('"url" NOT IN (:...urls)', { urls });
    }
    if (externalIds.length) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('"externalId" IS NULL').orWhere(
            '"externalId" NOT IN (:...externalIds)',
            { externalIds },
          );
        }),
      );
    }

    const result = await qb.execute();
    return { closed: result.affected ?? 0 };
  }

  /**
   * Open offers most overdue for a "does this still exist?" probe.
   *
   * Ordered oldest-check-first so the queue drains evenly, and offers somebody
   * saved or applied to jump ahead of the rest.
   */
  async findStale(
    limit: number,
    olderThanHours: number,
  ): Promise<StalePostingSummary[]> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    return this.jobPostingRepository
      .createQueryBuilder('job')
      .select('job.id', 'id')
      .addSelect('job.url', 'url')
      .where('job.closedAt IS NULL')
      .andWhere(
        new Brackets((w) => {
          w.where('job.lastValidatedAt IS NULL').orWhere(
            'job.lastValidatedAt < :cutoff',
            { cutoff },
          );
        }),
      )
      .orderBy(
        `CASE WHEN EXISTS (
           SELECT 1 FROM "job_posting_interaction" i
           WHERE i."jobPostingId" = job."id"
             AND (i."saved" OR i."applicationId" IS NOT NULL)
         ) THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('job.lastValidatedAt', 'ASC', 'NULLS FIRST')
      .limit(Math.min(Math.max(limit, 1), 500))
      .getRawMany<StalePostingSummary>();
  }

  /** Records what the worker's probe found, one statement per verdict group. */
  async applyValidity(
    results: JobPostingValidityDto[],
  ): Promise<{ closed: number; confirmed: number }> {
    const alive = results.filter((r) => r.alive).map((r) => r.id);
    const dead = results.filter((r) => !r.alive);

    if (alive.length) {
      await this.jobPostingRepository.update(
        { id: In(alive) },
        { lastValidatedAt: new Date() },
      );
    }

    let closed = 0;
    // Grouped by reason so each group is a single statement.
    const byReason = new Map<JobPostingClosedReason, string[]>();
    for (const verdict of dead) {
      const reason = verdict.reason ?? JobPostingClosedReason.DEAD_LINK;
      byReason.set(reason, [...(byReason.get(reason) ?? []), verdict.id]);
    }
    for (const [reason, ids] of byReason) {
      const result = await this.jobPostingRepository.update(
        { id: In(ids), closedAt: IsNull() },
        {
          closedAt: new Date(),
          closedReason: reason,
          lastValidatedAt: new Date(),
        },
      );
      closed += result.affected ?? 0;
    }

    return { closed, confirmed: alive.length };
  }

  /**
   * Closes offers whose own advertised expiry has passed.
   *
   * Cheap to run and needs no network, so it complements the probe rather than
   * waiting for one.
   */
  async closeExpired(): Promise<number> {
    const result = await this.jobPostingRepository
      .createQueryBuilder()
      .update(JobPosting)
      .set({
        closedAt: () => 'now()',
        closedReason: JobPostingClosedReason.EXPIRED,
      })
      .where('"closedAt" IS NULL')
      .andWhere('"validThrough" IS NOT NULL')
      .andWhere('"validThrough" < now()')
      .execute();
    return result.affected ?? 0;
  }
}
