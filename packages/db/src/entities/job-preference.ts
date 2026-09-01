import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyIndustry } from '../types/company/industry';
import { EmploymentType } from '../types/job-posting/employment-type';
import { RemoteType } from '../types/job-posting/remote-type';
import { SeniorityLevel, WorkDomain } from '../types/job-posting/work-domain';
import type { MatchWeights } from '../types/job-preference/importance';
import { User } from './user';

/**
 * What a user is actually looking for — the input to the match score.
 *
 * Every field is optional and an empty one means "no opinion", not "nothing
 * matches": a profile that names only "internship" still sees every offer, just
 * ranked with internships on top. That is what keeps a mislabelled board from
 * hiding a real offer.
 */
@Entity()
@Unique(['user'])
export class JobPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  /** The goal: internship, apprenticeship, full time… */
  @Column({
    type: 'enum',
    enum: EmploymentType,
    array: true,
    default: () => "'{}'",
  })
  employmentTypes: EmploymentType[];

  @Column({
    type: 'enum',
    enum: RemoteType,
    array: true,
    default: () => "'{}'",
  })
  remoteTypes: RemoteType[];

  /** ISO 3166-1 alpha-2 codes. Several countries, or one, or none. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  countries: string[];

  /** Exact city names as they appear on the offers. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  cities: string[];

  /** What the user actually wants to build: backend, product, ML… */
  @Column({
    type: 'enum',
    enum: WorkDomain,
    array: true,
    default: () => "'{}'",
  })
  domains: WorkDomain[];

  @Column({
    type: 'enum',
    enum: SeniorityLevel,
    array: true,
    default: () => "'{}'",
  })
  seniorities: SeniorityLevel[];

  /**
   * What matters to them beyond the job title — "climate", "open source",
   * "small team". Matched against the offer's own words, so it rewards
   * companies that describe themselves the same way.
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  motivations: string[];

  /** Titles and skills to look for, matched against the offer's text. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  keywords: string[];

  /**
   * Role titles, matched against the offer's title alone.
   *
   * Kept apart from `keywords` because where a term appears changes what it
   * means: "data" in a title is the job, "data" in a description is a sentence
   * about the product. Substring matching, so "data engineer" also catches
   * "Senior Data Engineer (F/H)".
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  titles: string[];

  /**
   * Terms an offer must mention to count as a match.
   *
   * Unlike `keywords` these are a requirement rather than a ranking signal, so
   * they are the one part of the profile that can empty the board. The form
   * says so, and the "only matches" toggle is what applies them.
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  requiredKeywords: string[];

  /** Industries worth working in, read off the offer's company. */
  @Column({
    type: 'enum',
    enum: CompanyIndustry,
    array: true,
    default: () => "'{}'",
  })
  industries: CompanyIndustry[];

  /**
   * The user's CV, as text.
   *
   * Stored so the terms can be re-derived when the extraction improves, and so
   * the user can see and correct what we read them as. It is never shown to
   * anybody else and never leaves the row.
   */
  @Column({ type: 'text', nullable: true })
  resumeText: string | null;

  /** Skills pulled out of the CV — the part that actually does the matching. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  resumeKeywords: string[];

  @Column({ type: 'timestamp', nullable: true })
  resumeUpdatedAt: Date | null;

  /** Offers mentioning any of these are hidden outright. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  excludedKeywords: string[];

  /**
   * Companies never to show. Stored as ids rather than names so a company
   * renaming itself does not quietly come back onto the board.
   */
  @Column({ type: 'uuid', array: true, default: () => "'{}'" })
  excludedCompanyIds: string[];

  @Column({ type: 'int', nullable: true })
  minSalary: number | null;

  /**
   * The currency `minSalary` is written in.
   *
   * Without it the threshold is meaningless across borders — 45000 GBP and
   * 45000 CZK are not the same wish — so an offer priced in another currency is
   * scored as "unknown" rather than compared.
   */
  @Column({ type: 'varchar', length: 3, nullable: true })
  salaryCurrency: string | null;

  /**
   * How old an offer may be before it stops counting as fresh.
   *
   * Applications close long before postings disappear, so recency is part of
   * fit rather than a filter: past this many days an offer loses the freshness
   * points, it does not leave the board.
   */
  @Column({ type: 'int', nullable: true })
  maxAgeDays: number | null;

  /**
   * Whether somewhere outside the named places is still worth seeing.
   *
   * Turns a location miss from zero into partial credit, which is the
   * difference between "I live here" and "I would move for the right thing".
   */
  @Column({ default: false })
  openToRelocation: boolean;

  /**
   * Per-criterion importance, keyed by `MatchCriterion`.
   *
   * jsonb rather than a column each: the criteria list follows the scorer, and
   * every new signal would otherwise cost a migration.
   */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  weights: MatchWeights;

  /** Email a digest when new offers match. */
  @Column({ default: true })
  notifyMatches: boolean;

  /** Where the last digest stopped, so the next one does not repeat itself. */
  @Column({ type: 'timestamp', nullable: true })
  lastNotifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
