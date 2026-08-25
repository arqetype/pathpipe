import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyIndustry } from '../types/company/industry';

export enum CompanyStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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

  @Column({ type: 'bytea', nullable: true })
  logoBlob: Buffer;

  @Column({ nullable: true })
  logoMimeType: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  careersUrl: string;

  @Column({ type: 'enum', enum: CompanyIndustry, nullable: true })
  industry: CompanyIndustry;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
