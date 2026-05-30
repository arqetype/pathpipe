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
import { ApplicationStatus } from '../types/application/status';
import { User } from './user';
import { Company } from './company';
import { ApplicationTier } from '../types/application/tier';

@Entity()
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
