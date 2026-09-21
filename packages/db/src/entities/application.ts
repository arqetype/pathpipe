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
import { UserFile } from './user-file';

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

  /**
   * The CV and the letter this application was sent with.
   *
   * A reference to the shared document store rather than a copy: the same CV
   * backs thirty applications, and answering "which one did I send them?" six
   * weeks later is the whole point of recording it. Eager, because an
   * application is almost always read to be shown, and the two rows it pulls
   * carry no file bytes.
   */
  @ManyToOne(() => UserFile, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'resumeFileId' })
  resumeFile: UserFile | null;

  @ManyToOne(() => UserFile, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'coverLetterFileId' })
  coverLetterFile: UserFile | null;

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
