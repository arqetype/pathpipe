import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import {
  STALE_AFTER_DAYS,
  STRONG_MATCH_SCORE,
  type DashboardApplication,
  type DashboardResponse,
  type DashboardStats,
} from '@repo/db/query/dashboard';
import type { JobPostingResponse } from '@repo/db/query/job-posting';
import { JobPostingService } from '../job-posting/job-posting.service';
import { completenessOf, isConfigured } from '../job-posting/job-match';

const DAY_MS = 86_400_000;

/** How many rows each list on the home page carries. */
const LIST_SIZE = 5;

/** Statuses that are still moving — everything else is a closed thread. */
const OPEN_STATUSES = [
  ApplicationStatus.WISHLIST,
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
];

/** A reply of any kind, good or bad — proof the application was read. */
const ANSWERED_STATUSES = [
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
];

/** What a skipped offer query returns, typed so the payload stays inferable. */
const NO_HIGHLIGHTS: { data: JobPostingResponse[]; total: number } = {
  data: [],
  total: 0,
};

const daysSince = (date: Date | string | null | undefined): number => {
  if (!date) return 0;
  const elapsed = Date.now() - new Date(date).getTime();
  return elapsed > 0 ? Math.floor(elapsed / DAY_MS) : 0;
};

/**
 * The home page, in one request.
 *
 * It is a read-only composition over the boards the user already has, which is
 * why it owns no entity of its own: every number here is also reachable through
 * `/applications` or `/job-postings`, and the point of this endpoint is to not
 * make the home page fetch both boards in full to count their rows.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly jobPostingService: JobPostingService,
  ) {}

  async overview(userId: string): Promise<DashboardResponse> {
    // The viewer carries the profile the scores are built from, so it is loaded
    // once here rather than by each offer query below.
    const viewer = await this.jobPostingService.viewer(userId);
    const hasProfile = isConfigured(viewer.preference);

    const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * DAY_MS);
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(Date.now() - 14 * DAY_MS);

    const [
      byStatus,
      staleApplied,
      appliedThisWeek,
      appliedLastWeek,
      answered,
      everSent,
      topMatches,
      savedOffers,
      wishlistApplications,
      staleApplications,
    ] = await Promise.all([
      this.countByStatus(userId),
      this.countStale(userId, staleBefore),
      this.countSentBetween(userId, weekAgo, null),
      this.countSentBetween(userId, twoWeeksAgo, weekAgo),
      this.countIn(userId, ANSWERED_STATUSES),
      // Anything answered has necessarily been sent, even if it never carried
      // an `appliedAt` — hence the union rather than a count of `APPLIED`.
      this.countSent(userId),
      // Without a profile nothing carries a score, and a score filter with no
      // score behind it would match the entire board — so the whole slice is
      // empty rather than everything. The page then asks for a profile instead.
      hasProfile
        ? this.jobPostingService.highlights(
            userId,
            {
              minScore: STRONG_MATCH_SCORE,
              status: [JobPostingStatus.NEW, JobPostingStatus.SEEN],
              tracked: false,
              sortBy: 'match',
              sortOrder: 'desc',
              limit: LIST_SIZE,
            },
            viewer,
          )
        : Promise.resolve(NO_HIGHLIGHTS),
      this.jobPostingService.highlights(
        userId,
        {
          saved: true,
          tracked: false,
          sortBy: 'postedAt',
          sortOrder: 'desc',
          limit: LIST_SIZE,
        },
        viewer,
      ),
      this.listByStatus(userId, ApplicationStatus.WISHLIST),
      this.listStale(userId, staleBefore),
    ]);

    const count = (status: ApplicationStatus) => byStatus.get(status) ?? 0;
    const totalApplications = OPEN_STATUSES.concat(
      ApplicationStatus.REJECTED,
      ApplicationStatus.GHOSTED,
    ).reduce((sum, status) => sum + count(status), 0);

    const stats: DashboardStats = {
      wishlist: count(ApplicationStatus.WISHLIST),
      applied: count(ApplicationStatus.APPLIED),
      interview: count(ApplicationStatus.INTERVIEW),
      offer: count(ApplicationStatus.OFFER),
      rejected: count(ApplicationStatus.REJECTED),
      ghosted: count(ApplicationStatus.GHOSTED),
      totalApplications,
      staleApplied,
      appliedThisWeek,
      appliedLastWeek,
      responseRate: everSent ? Math.round((answered / everSent) * 100) : null,
      strongMatches: topMatches.total,
      savedUndecided: savedOffers.total,
      hasProfile,
      profileCompleteness: completenessOf(viewer.preference),
    };

    return {
      stats,
      topMatches: topMatches.data,
      savedOffers: savedOffers.data,
      wishlistApplications,
      staleApplications,
    };
  }

  // ----------------------------------------------------------------- counting

  /** Every column of the board in one pass rather than one query per status. */
  private async countByStatus(
    userId: string,
  ): Promise<Map<ApplicationStatus, number>> {
    const rows = await this.scoped(userId)
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status')
      .getRawMany<{ status: ApplicationStatus; count: string }>();

    return new Map(rows.map((row) => [row.status, Number(row.count)]));
  }

  private countIn(
    userId: string,
    statuses: ApplicationStatus[],
  ): Promise<number> {
    return this.scoped(userId)
      .andWhere('application.status IN (:...statuses)', { statuses })
      .getCount();
  }

  /**
   * Applications that were actually sent.
   *
   * A row can carry a reply without an `appliedAt` — the date is only stamped
   * when the move happens in the app — so "sent" is either the date or a status
   * that could not have been reached without sending.
   */
  private countSent(userId: string): Promise<number> {
    return this.scoped(userId)
      .andWhere(
        '(application.appliedAt IS NOT NULL OR application.status IN (:...sent))',
        {
          sent: [
            ApplicationStatus.APPLIED,
            ...ANSWERED_STATUSES,
            ApplicationStatus.GHOSTED,
          ],
        },
      )
      .getCount();
  }

  private countSentBetween(
    userId: string,
    from: Date,
    to: Date | null,
  ): Promise<number> {
    const qb = this.scoped(userId).andWhere('application.appliedAt >= :from', {
      from,
    });
    if (to) qb.andWhere('application.appliedAt < :to', { to });
    return qb.getCount();
  }

  private countStale(userId: string, before: Date): Promise<number> {
    return this.staleQuery(userId, before).getCount();
  }

  // ------------------------------------------------------------------ listing

  private async listByStatus(
    userId: string,
    status: ApplicationStatus,
  ): Promise<DashboardApplication[]> {
    const rows = await this.scoped(userId)
      .leftJoinAndSelect('application.company', 'company')
      .andWhere('application.status = :status', { status })
      // Tier first: a wishlist is a ranked list, and the S-tier row is the one
      // the user meant to apply to.
      .addSelect(
        `CASE application.tier WHEN 'S_TIER' THEN 1 WHEN 'A_TIER' THEN 2 WHEN 'B_TIER' THEN 3 ELSE 4 END`,
        'tier_rank',
      )
      .orderBy('tier_rank', 'ASC')
      .addOrderBy('application.created_at', 'ASC')
      .limit(LIST_SIZE)
      .getMany();

    return rows.map(toDashboardApplication);
  }

  private async listStale(
    userId: string,
    before: Date,
  ): Promise<DashboardApplication[]> {
    const rows = await this.staleQuery(userId, before)
      .leftJoinAndSelect('application.company', 'company')
      // Quietest first — that is the one about to go cold.
      .orderBy('application.appliedAt', 'ASC')
      .limit(LIST_SIZE)
      .getMany();

    return rows.map(toDashboardApplication);
  }

  // ------------------------------------------------------------------ helpers

  /** Sent, still waiting, and nothing has moved for long enough to chase. */
  private staleQuery(userId: string, before: Date) {
    return this.scoped(userId)
      .andWhere('application.status = :status', {
        status: ApplicationStatus.APPLIED,
      })
      .andWhere('application.appliedAt IS NOT NULL')
      .andWhere('application.appliedAt < :before', { before });
  }

  /**
   * Every query here reads one user's board.
   *
   * Soft-deleted rows are excluded by the query builder itself, so a deleted
   * application never shows up in a count.
   */
  private scoped(userId: string) {
    return this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.user', 'user')
      .where('user.id = :userId', { userId });
  }
}

const toDashboardApplication = (
  application: Application,
): DashboardApplication => ({
  id: application.id,
  position: application.position,
  companyName: application.company?.name ?? null,
  url: application.url ?? null,
  status: application.status,
  tier: application.tier,
  appliedAt: application.appliedAt
    ? new Date(application.appliedAt).toISOString()
    : null,
  createdAt: new Date(application.created_at).toISOString(),
  daysSince: daysSince(application.appliedAt ?? application.created_at),
});
