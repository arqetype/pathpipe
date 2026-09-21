import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { JobPostingStatus } from '../types/job-posting/status';
import { User } from './user';
import { JobPosting } from './job-posting';
import { Application } from './application';

/**
 * What one user did with one offer.
 *
 * Rows exist only once a user acts — with a global offer table, a row per user
 * per offer would be millions of rows saying "unread". No row means
 * {@link JobPostingStatus.NEW}, which is also why the board reads status with a
 * LEFT JOIN and a COALESCE rather than an inner join.
 */
@Entity()
@Unique(['user', 'jobPosting'])
@Index(['userId', 'status'])
export class JobPostingInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => JobPosting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting;

  @Column({ type: 'uuid' })
  jobPostingId: string;

  @Column({
    type: 'enum',
    enum: JobPostingStatus,
    default: JobPostingStatus.SEEN,
  })
  status: JobPostingStatus;

  /** Bookmarked, independent of `status`. */
  @Column({ default: false })
  saved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  savedAt: Date | null;

  /** Set when the user pushed this offer onto their applications board. */
  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'applicationId' })
  application: Application | null;

  @Column({ type: 'uuid', nullable: true })
  applicationId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
