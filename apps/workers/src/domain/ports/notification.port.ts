import { User } from '@repo/db/entities/user';
import { ScoredJob } from './scoring.port';

export interface NotificationPort {
  sendJobAlert(candidate: User, jobs: ScoredJob[]): Promise<void>;
}
