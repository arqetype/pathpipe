import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Meal } from './meal';
import { Goal } from './goal';
import { AIRequest } from './ai-request';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  github_id: string;

  @Column({ default: false })
  is_github_user: boolean;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ default: true })
  need_otp: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Meal, (meal) => meal.user)
  meals: Meal[];

  @OneToMany(() => Goal, (goal) => goal.user)
  goals: Goal[];

  @OneToMany(() => AIRequest, (aiRequest) => aiRequest.user)
  aiRequests: AIRequest[];
}
