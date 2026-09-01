import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { JobPosting } from './job-posting';

/**
 * One place an offer is open in.
 *
 * A row per place rather than a column on the offer: boards routinely list a
 * role in several cities, and joining those into one string is what made
 * "San Francisco" and "San Francisco, New York City" behave as two unrelated
 * values in the filter list.
 */
@Entity()
@Unique(['jobPosting', 'city', 'region', 'country'])
@Index(['city'])
@Index(['country'])
export class JobPostingLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => JobPosting, (posting) => posting.locations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobPostingId' })
  jobPosting: JobPosting;

  @Column({ type: 'uuid' })
  jobPostingId: string;

  /**
   * Empty string rather than null when the board named no city.
   *
   * The unique constraint has to catch duplicates, and Postgres treats NULLs as
   * distinct — two "France, no city" rows would both be allowed.
   */
  @Column({ default: '' })
  city: string;

  @Column({ default: '' })
  region: string;

  /** ISO 3166-1 alpha-2, or empty when the board did not say. */
  @Column({ default: '' })
  country: string;

  /** What the board actually wrote, kept for display and for bad parses. */
  @Column({ default: '' })
  raw: string;
}
