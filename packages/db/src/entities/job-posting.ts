import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { JobPostingClosedReason } from '../types/job-posting/closed-reason';
import { EmploymentType } from '../types/job-posting/employment-type';
import { RemoteType } from '../types/job-posting/remote-type';
import { SeniorityLevel, WorkDomain } from '../types/job-posting/work-domain';
import { Company } from './company';
import { JobPostingLocation } from './job-posting-location';

/**
 * One job offer, as a company published it. Global: every user sees every
 * offer, and what a *particular* user did with it lives on
 * `JobPostingInteraction` instead.
 *
 * Two groups of columns change for different reasons:
 *
 *   - what the board said (title, description, salary…) — rewritten whenever a
 *     richer scrape of the same posting comes in;
 *   - whether the offer still exists (`lastSeenAt`, `closedAt`) — every offer is
 *     temporary, so an open posting is one we saw on the last full crawl and
 *     whose page still answers.
 */
@Entity()
@Unique(['company', 'url'])
@Unique(['company', 'dedupKey'])
@Index(['closedAt', 'postedAt'])
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  url: string;

  /**
   * Stable id from the source ATS. Boards rewrite their slugs when a title is
   * edited, so this — not the URL — is what keeps a posting from being
   * re-announced as new.
   */
  @Column({ nullable: true })
  externalId: string | null;

  /** Plain text, used for search and previews. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Sanitised markup, used to render the offer the way the board wrote it. */
  @Column({ type: 'text', nullable: true })
  descriptionHtml: string | null;

  @Column({ nullable: true })
  location: string | null;

  /**
   * Title and city, folded — what two copies of the same opening still agree on
   * when they come from different boards. The URL and the ATS id only settle
   * identity inside one board; this is what keeps a cross-posted role, or a
   * board that moved, from landing twice.
   */
  @Column({ type: 'text' })
  dedupKey: string;

  /**
   * Digest of everything a re-read of this posting could change.
   *
   * A crawl re-reads the same board every few hours and almost nothing on it
   * moves. Comparing this against the incoming digest is what lets the merge
   * touch only `lastSeenAt` for an unchanged offer — no column rewrite, no
   * location resync, no re-classification, no tsvector rebuild. That is where
   * the steady-state cost of watching a board goes to nearly zero.
   */
  @Column({ type: 'text', nullable: true })
  contentHash: string | null;

  @Column({ nullable: true })
  department: string | null;

  /**
   * The part of software this role belongs to, read from the title at ingest.
   *
   * Classified once on the way in rather than guessed at per query: matching
   * "what do you want to work on?" against free text is a comparison the
   * database cannot index, and this is.
   */
  @Column({ type: 'enum', enum: WorkDomain, nullable: true })
  domain: WorkDomain | null;

  @Column({ type: 'enum', enum: SeniorityLevel, nullable: true })
  seniority: SeniorityLevel | null;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    nullable: true,
  })
  employmentType: EmploymentType | null;

  @Column({
    type: 'enum',
    enum: RemoteType,
    nullable: true,
  })
  remoteType: RemoteType | null;

  @Column({ nullable: true })
  salaryMin: number | null;

  @Column({ nullable: true })
  salaryMax: number | null;

  @Column({ nullable: true })
  salaryCurrency: string | null;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'timestamp', nullable: true })
  postedAt: Date | null;

  /** Expiry date the posting advertises for itself (schema.org validThrough). */
  @Column({ type: 'timestamp', nullable: true })
  validThrough: Date | null;

  /** Last crawl that still found this posting on its board. */
  @Index()
  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  /** Set once the offer is gone; null means it is still open. */
  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({
    type: 'enum',
    enum: JobPostingClosedReason,
    nullable: true,
  })
  closedReason: JobPostingClosedReason | null;

  /** Last time the detail page itself was fetched for the full description. */
  @Column({ type: 'timestamp', nullable: true })
  detailFetchedAt: Date | null;

  /** Last time the posting's URL was probed to confirm it still exists. */
  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt: Date | null;

  /**
   * Full-text index over title, location, department and description.
   *
   * Generated and maintained by Postgres (see the migration), never written from
   * here — hence `insert`/`update` off. Kept out of every SELECT: it is large,
   * and nothing outside the search predicate reads it.
   */
  @Column({
    type: 'tsvector',
    select: false,
    insert: false,
    update: false,
    nullable: true,
  })
  searchVector?: string;

  @ManyToOne(() => Company, { eager: true })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  companyId: string;

  /**
   * Every place the offer names, one row each — so a filter list shows
   * "San Francisco" and "New York City", not "San Francisco, New York City".
   */
  @OneToMany(() => JobPostingLocation, (location) => location.jobPosting, {
    cascade: false,
  })
  locations: JobPostingLocation[];

  /**
   * When we first saw this opening — first-seen, not "row written".
   *
   * The two are the same thing on purpose: deduplication keeps the oldest row
   * and merges the newer copy into it, so a role cross-posted to a second board
   * in March still dates from when the first board published it.
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
