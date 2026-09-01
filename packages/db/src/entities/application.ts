import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '../types/application/status';
import { User } from './user';
import { Company } from './company';
import { ApplicationTier } from '../types/application/tier';

@Entity()
@Index(['city'])
@Index(['country'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  position: string;

  @Column({ type: 'int', nullable: true })
  kanbanOrder?: number;

  @ManyToOne(() => Company, { nullable: true, eager: true })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ nullable: true })
  url: string;

  /**
   * Where the job is, as two fields rather than one line.
   *
   * "Paris, France" typed freely sorts and groups as a different place from
   * "Paris (France)", and a filter over one string cannot tell them apart.
   * Either half may stand alone: a remote role in France names no city, and a
   * city is often all a posting gives.
   */
  @Column({ nullable: true })
  city: string | null;

  /** ISO 3166-1 alpha-2, so a country reads the same however it was typed. */
  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string | null;

  @Column({ nullable: true })
  salaryMin: number;

  @Column({ nullable: true })
  salaryMax: number;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.WISHLIST,
  })
  status: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: ApplicationTier,
    default: ApplicationTier.NONE,
  })
  tier: ApplicationTier;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  appliedAt: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;
}
