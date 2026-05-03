import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user';

export enum CompanyStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
@Unique(['name'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  careersUrl: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  country: string;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.PENDING,
  })
  status: CompanyStatus;

  @Column({ default: false })
  isMonitored: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date;

  @ManyToMany(() => User, (user) => user.watchedCompanies)
  watchers: User[];

  @CreateDateColumn()
  created_at: Date;
}
