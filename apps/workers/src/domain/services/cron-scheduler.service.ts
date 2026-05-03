import { Cron } from 'croner';
import { JobDiscoveryService } from './job-discovery.service';
import { ScoringService } from './scoring.service';
import { NotificationService } from './notification.service';
import { EnterpriseDiscoveryService } from './enterprise-discovery.service';
import { TaskRepository } from '@/infrastructure/task/task-repository';
import { TaskType } from '@repo/db/entities/task';

export class CronSchedulerService {
  private readonly jobs: Cron[] = [];

  constructor(
    private readonly jobDiscovery: JobDiscoveryService,
    private readonly enterpriseDiscovery: EnterpriseDiscoveryService,
    private readonly scoring: ScoringService,
    private readonly notification: NotificationService,
    private readonly taskRepository: TaskRepository,
  ) {}

  scheduleAll() {
    // Discover new jobs every 15 minutes
    const discoverJobs = new Cron('*/15 * * * *', async () => {
      const task = await this.taskRepository.create({
        type: TaskType.JOB_DISCOVERY,
      });
      try {
        await this.taskRepository.setRunning(task.uuid);
        const result = await this.jobDiscovery.discoverFromAllSources();
        await this.taskRepository.setCompleted(task.uuid, result);
      } catch (error) {
        await this.taskRepository.setFailed(task.uuid, String(error));
      }
    });

    // Discover enterprises for candidates every hour
    const discoverEnterprises = new Cron('0 * * * *', async () => {
      const task = await this.taskRepository.create({
        type: TaskType.ENTERPRISE_DISCOVERY,
      });
      try {
        await this.taskRepository.setRunning(task.uuid);
        const result =
          await this.enterpriseDiscovery.discoverForAllCandidates();
        await this.taskRepository.setCompleted(task.uuid, result);
      } catch (error) {
        await this.taskRepository.setFailed(task.uuid, String(error));
      }
    });

    // Score new jobs every 30 minutes
    const scoreJobs = new Cron('*/30 * * * *', async () => {
      const task = await this.taskRepository.create({ type: TaskType.SCORING });
      try {
        await this.taskRepository.setRunning(task.uuid);
        const result = await this.scoring.scoreAllActiveCandidates();
        await this.taskRepository.setCompleted(task.uuid, result);
      } catch (error) {
        await this.taskRepository.setFailed(task.uuid, String(error));
      }
    });

    this.jobs.push(discoverJobs, discoverEnterprises, scoreJobs);
  }

  async triggerJobDiscovery(
    params?: Record<string, unknown>,
  ): Promise<{ uuid: string }> {
    const task = await this.taskRepository.create({
      type: TaskType.JOB_DISCOVERY,
      params,
    });
    this.runJobDiscovery(task.uuid);
    return { uuid: task.uuid };
  }

  async triggerEnterpriseDiscovery(
    params?: Record<string, unknown>,
  ): Promise<{ uuid: string }> {
    const task = await this.taskRepository.create({
      type: TaskType.ENTERPRISE_DISCOVERY,
      params,
    });
    this.runEnterpriseDiscovery(task.uuid);
    return { uuid: task.uuid };
  }

  async triggerScoring(candidateId?: string): Promise<{ uuid: string }> {
    const task = await this.taskRepository.create({
      type: TaskType.SCORING,
      params: candidateId ? { candidateId } : undefined,
    });
    this.runScoring(task.uuid, candidateId);
    return { uuid: task.uuid };
  }

  async triggerNotifications(
    params?: Record<string, unknown>,
  ): Promise<{ uuid: string }> {
    const task = await this.taskRepository.create({
      type: TaskType.NOTIFICATIONS,
      params,
    });
    this.runNotifications(task.uuid);
    return { uuid: task.uuid };
  }

  private async runJobDiscovery(uuid: string) {
    try {
      await this.taskRepository.setRunning(uuid);
      const result = await this.jobDiscovery.discoverFromAllSources();
      await this.taskRepository.setCompleted(uuid, result);
    } catch (error) {
      await this.taskRepository.setFailed(uuid, String(error));
    }
  }

  private async runEnterpriseDiscovery(uuid: string) {
    try {
      await this.taskRepository.setRunning(uuid);
      const result = await this.enterpriseDiscovery.discoverForAllCandidates();
      await this.taskRepository.setCompleted(uuid, result);
    } catch (error) {
      await this.taskRepository.setFailed(uuid, String(error));
    }
  }

  private async runScoring(uuid: string, candidateId?: string) {
    try {
      await this.taskRepository.setRunning(uuid);
      const result = await this.scoring.scoreCandidates(candidateId);
      await this.taskRepository.setCompleted(uuid, result);
    } catch (error) {
      await this.taskRepository.setFailed(uuid, String(error));
    }
  }

  private async runNotifications(uuid: string) {
    try {
      await this.taskRepository.setRunning(uuid);
      const result = await this.notification.sendAllPendingNotifications();
      await this.taskRepository.setCompleted(uuid, result);
    } catch (error) {
      await this.taskRepository.setFailed(uuid, String(error));
    }
  }
}
