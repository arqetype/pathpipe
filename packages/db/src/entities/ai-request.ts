import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user';
import { Meal } from './meal';

@Entity()
export class AIRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  raw_input: string;

  @Column('jsonb')
  raw_output: object;

  @Column({ default: false })
  moderated: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.aiRequests)
  user: User;

  @ManyToOne(() => Meal, { nullable: true })
  @JoinColumn({ name: 'linked_meal_id' })
  linked_meal: Meal;
}
