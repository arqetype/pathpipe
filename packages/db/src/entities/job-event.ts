import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobEventType } from '../types/job-event/type';
import { User } from './user';
import { JobPosting } from './job-posting';
import { Application } from './application';

/**
 * One thing that happened, written once and never touched again.
 *
 * There is no `UpdateDateColumn` and nothing updates a row here: an event is a
 * fact about a past moment, and a fact that can be rewritten is a status column
 * wearing a costume. The status columns on `Application` and
 * `JobPostingInteraction` survive as a derived cache — cheap to filter and sort
 * on — but this table is what they are derived from.
 *
 * `occurredAt` is separate from `createdAt` because the two answer different
 * questions: a user recording on Friday that they chased a company on Tuesday
 * needs Tuesday for their timeline and Friday for us.
 */
@Entity()
@Index(['userId', 'occurredAt'])
@Index(['applicationId', 'occurredAt'])
@Index(['jobPostingId', 'type'])
export class JobEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: JobEventType })
  type: JobEventType;

  /** When it happened, as opposed to when we were told. */
  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Nulled rather than cascaded when a posting goes away.
   *
   * Deduplication deletes the losing copy of an offer, and a CASCADE would take
   * the user's history of it down with the row. The event still says what
   * happened and when; it just stops pointing at a posting.
   */
  @ManyToOne(() => JobPosting, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting | null;

  @Column({ type: 'uuid', nullable: true })
  jobPostingId: string | null;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'applicationId' })
  application: Application | null;

  @Column({ type: 'uuid', nullable: true })
  applicationId: string | null;

  /**
   * What the event carries, when it carries anything.
   *
   * For {@link JobEventType.APPLICATION_SENT} this is the frozen job
   * description — the wording the user actually answered. Boards edit postings
   * in place and take them down entirely, so six weeks later the live page is
   * no evidence of what was on offer. A note travels here too.
   */
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
