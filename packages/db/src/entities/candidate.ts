import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateStage } from '../types/candidate/stage';
import { CandidateSource } from '../types/candidate/source';
import { JobOpening } from './job-opening';

@Entity()
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  linkedinUrl: string;

  @Column({ nullable: true })
  resumeUrl: string;

  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @Column({
    type: 'enum',
    enum: CandidateStage,
    default: CandidateStage.APPLIED,
  })
  stage: CandidateStage;

  @Column({
    type: 'enum',
    enum: CandidateSource,
    default: CandidateSource.MANUAL,
  })
  source: CandidateSource;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => JobOpening, { nullable: true })
  @JoinColumn()
  jobOpening: JobOpening;
}
