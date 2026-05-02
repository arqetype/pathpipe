import { Cron } from 'croner';
import { JobDiscoveryService } from './job-discovery.service';
import { ScoringService } from './scoring.service';
import { NotificationService } from './notification.service';
import { EnterpriseDiscoveryService } from './enterprise-discovery.service';

export class CronSchedulerService {
  private readonly jobs: Cron[] = [];

  constructor(
    private readonly jobDiscovery: JobDiscoveryService,
    private readonly enterpriseDiscovery: EnterpriseDiscoveryService,
    private readonly scoring: ScoringService,
    private readonly notification: NotificationService,
  ) {}

  scheduleAll() {
    // Discover new jobs every 15 minutes
    const discoverJobs = new Cron('*/15 * * * *', async () => {
      await this.jobDiscovery.discoverFromAllSources();
    });

    // Discover enterprises for candidates every hour
    const discoverEnterprises = new Cron('0 * * * *', async () => {
      await this.enterpriseDiscovery.discoverForAllCandidates();
    });

    // Score new jobs every 30 minutes
    const scoreJobs = new Cron('*/30 * * * *', async () => {
      const scoredJobs = await this.scoring.scoreAllActiveCandidates();
      await this.notification.sendNotificationsForAllCandidates(scoredJobs);
    });

    this.jobs.push(discoverJobs, discoverEnterprises, scoreJobs);
  }

  async triggerJobDiscovery() {
    return this.jobDiscovery.discoverFromAllSources();
  }

  async triggerEnterpriseDiscovery() {
    return this.enterpriseDiscovery.discoverForAllCandidates();
  }

  async triggerScoring(candidateId?: string) {
    return this.scoring.scoreCandidates(candidateId);
  }

  async triggerNotifications() {
    return this.notification.sendAllPendingNotifications();
  }
}
