import { NotificationPort } from '../ports/notification.port';
import { ScoredJob } from '../ports/scoring.port';

export class NotificationService {
  constructor(private readonly notificationAdapter: NotificationPort) {}

  async sendNotificationsForAllCandidates(
    _scoredJobsMap: Map<string, ScoredJob[]>,
  ): Promise<void> {
    // TODO: Implement notification dispatch
    console.log('Notification: sending notifications for all candidates');
  }

  async sendJobAlertToCandidate(
    _candidateId: string,
    jobs: ScoredJob[],
  ): Promise<void> {
    // TODO: Fetch candidate and send job alert
    console.log('Notification: sending job alert with', jobs.length, 'jobs');
  }

  async sendAllPendingNotifications(): Promise<void> {
    // TODO: Send all pending notifications
    console.log('Notification: sending all pending notifications');
  }
}
