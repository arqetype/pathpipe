import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { Meal } from './meal';
import { Goal } from './goal';
import { AIRequest } from './ai-request';
import { createHash } from 'node:crypto';

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

  @Column({ default: false })
  email_verified: boolean;

  @Column({ default: false })
  need_otp: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Meal, (meal) => meal.user)
  meals: Meal[];

  @OneToMany(() => Goal, (goal) => goal.user)
  goals: Goal[];

  @OneToMany(() => AIRequest, (aiRequest) => aiRequest.user)
  aiRequests: AIRequest[];

  @BeforeInsert()
  hashPassword() {
    if (this.password) {
      this.password = createHash('sha256').update(this.password).digest('hex');
    }
  }
}
