import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum JobListingSource {
  ARBEITNOW = 'arbeitnow',
}

@Entity()
export class RawJobListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: JobListingSource,
  })
  source: JobListingSource;

  @Column()
  externalId: string;

  @Column()
  companyName: string;

  @Column()
  position: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', nullable: true })
  salaryMin: number;

  @Column({ type: 'decimal', nullable: true })
  salaryMax: number;

  @Column({ nullable: true })
  jobType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  postedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
