import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user';

export enum CompanySuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class CompanySuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  careersUrl: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  industry: string;

  @Column({
    type: 'enum',
    enum: CompanySuggestionStatus,
    default: CompanySuggestionStatus.PENDING,
  })
  status: CompanySuggestionStatus;

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  rejectionReason: string;

  @ManyToOne(() => User)
  @JoinColumn()
  suggestedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;
}
