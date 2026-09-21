import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import {
  ACTIVITY_DAYS,
  STALE_AFTER_DAYS,
  STRONG_MATCH_SCORE,
  type DashboardApplication,
  type DashboardResponse,
  type DashboardStats,
} from '@repo/db/query/dashboard';
import type { JobPostingResponse } from '@repo/db/query/job-posting';
import { JobPostingService } from '../job-posting/job-posting.service';
import { buildActivity, streakOf } from './activity';
import { completenessOf, isConfigured } from '../job-posting/match/shared';

const DAY_MS = 86_400_000;

const LIST_SIZE = 5;

const OPEN_STATUSES = [
  ApplicationStatus.WISHLIST,
  ApplicationStatus.APPLIED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
];

/** A reply of any kind. */
const ANSWERED_STATUSES = [
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
];

const NO_HIGHLIGHTS: { data: JobPostingResponse[]; total: number } = {
  data: [],
  total: 0,
};

const daysSince = (date: Date | string | null | undefined): number => {
  if (!date) return 0;
  const elapsed = Date.now() - new Date(date).getTime();
  return elapsed > 0 ? Math.floor(elapsed / DAY_MS) : 0;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly jobPostingService: JobPostingService,
  ) {}

  async overview(userId: string): Promise<DashboardResponse> {
    const viewer = await this.jobPostingService.viewer(userId);
    const hasProfile = isConfigured(viewer.preference);

    const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * DAY_MS);
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(Date.now() - 14 * DAY_MS);
    const activityFrom = new Date(Date.now() - ACTIVITY_DAYS * DAY_MS);

    const [
      byStatus,
      staleApplied,
      appliedThisWeek,
      appliedLastWeek,
      answered,
      everSent,
      sentPerDay,
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
      this.countSent(userId),
      this.sentPerDay(userId, activityFrom),
      // No profile: scores match everything.
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

    const activity = buildActivity(sentPerDay, new Date());

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
      streakDays: streakOf(activity),
      strongMatches: topMatches.total,
      savedUndecided: savedOffers.total,
      hasProfile,
      profileCompleteness: completenessOf(viewer.preference),
    };

    return {
      stats,
      activity,
      topMatches: topMatches.data,
      savedOffers: savedOffers.data,
      wishlistApplications,
      staleApplications,
    };
  }

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

  // Answered rows may lack appliedAt.
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

  // GROUP BY alias, Postgres only.
  private async sentPerDay(
    userId: string,
    from: Date,
  ): Promise<Map<string, number>> {
    const rows = await this.scoped(userId)
      .select(`to_char(application."appliedAt", 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .andWhere('application.appliedAt >= :from', { from })
      .groupBy('day')
      .getRawMany<{ day: string; count: string }>();

    return new Map(rows.map((row) => [row.day, Number(row.count)]));
  }

  private countStale(userId: string, before: Date): Promise<number> {
    return this.staleQuery(userId, before).getCount();
  }

  private async listByStatus(
    userId: string,
    status: ApplicationStatus,
  ): Promise<DashboardApplication[]> {
    const rows = await this.scoped(userId)
      .leftJoinAndSelect('application.company', 'company')
      .andWhere('application.status = :status', { status })
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
      .orderBy('application.appliedAt', 'ASC')
      .limit(LIST_SIZE)
      .getMany();

    return rows.map(toDashboardApplication);
  }

  private staleQuery(userId: string, before: Date) {
    return this.scoped(userId)
      .andWhere('application.status = :status', {
        status: ApplicationStatus.APPLIED,
      })
      .andWhere('application.appliedAt IS NOT NULL')
      .andWhere('application.appliedAt < :before', { before });
  }

  /** One user's board; soft-deletes excluded. */
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
  companyId: application.company?.id ?? null,
  url: application.url ?? null,
  status: application.status,
  tier: application.tier,
  appliedAt: application.appliedAt
    ? new Date(application.appliedAt).toISOString()
    : null,
  createdAt: new Date(application.created_at).toISOString(),
  daysSince: daysSince(application.appliedAt ?? application.created_at),
});
