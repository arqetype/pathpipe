import { NotificationPort } from '@/domain/ports/notification.port';
import { ScoredJob } from '@/domain/ports/scoring.port';
import { User } from '@repo/db/entities/user';
import { Mailer } from '@repo/email';

export class EmailNotificationAdapter implements NotificationPort {
  constructor(private readonly mailer: Mailer) {}

  async sendJobAlert(_candidate: User, _jobs: ScoredJob[]): Promise<void> {
    // TODO: Implement job alert email
    console.log(
      'EmailNotification: Sending job alert to',
      _candidate.email,
      'with',
      _jobs.length,
      'jobs',
    );
  }
}
