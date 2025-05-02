import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user';

@Entity()
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column()
  provider_id: string;

  @Column({ nullable: true })
  password_hash: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.accounts)
  user: User;
}
