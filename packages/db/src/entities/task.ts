import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskType {
  JOB_DISCOVERY = 'job_discovery',
  ENTERPRISE_DISCOVERY = 'enterprise_discovery',
  SCORING = 'scoring',
  NOTIFICATIONS = 'notifications',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: unknown;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
