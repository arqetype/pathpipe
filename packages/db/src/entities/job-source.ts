import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Crawl state for one careers URL, shared by every user watching that company.
 *
 * Keeping it per-URL rather than per-watch means a company followed by fifty
 * users is still fetched once, and lets the worker skip sources that have not
 * changed since the previous cycle.
 */
@Entity()
@Unique(['url'])
export class JobSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Normalised careers URL — the crawl identity. */
  @Column()
  url: string;

  /** ATS slug when one was detected, e.g. 'greenhouse'. */
  @Column({ nullable: true })
  platform: string | null;

  /** Pipeline rung that last produced jobs, used as a hint next cycle. */
  @Column({ nullable: true })
  strategy: string | null;

  @Column({ nullable: true })
  etag: string | null;

  @Column({ nullable: true })
  lastModified: string | null;

  /** Hash over the job set; equal hash means nothing new to ingest. */
  @Column({ nullable: true })
  contentHash: string | null;

  @Column({ type: 'int', default: 0 })
  jobCount: number;

  /** True when the last successful run needed a headless browser. */
  @Column({ default: false })
  requiresBrowser: boolean;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date | null;

  /** Last time the job set actually changed. */
  @Column({ type: 'timestamp', nullable: true })
  lastChangedAt: Date | null;

  /** Last time postings were written to the database from this source. */
  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
