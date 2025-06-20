import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user';

@Entity()
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  expires_at: Date;

  @Column({ default: false })
  used: boolean;

  @ManyToOne(() => User)
  user: User;

  @UpdateDateColumn()
  lastEmailSent: Date;
}
