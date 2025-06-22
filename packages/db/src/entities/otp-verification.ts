import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user';

@Entity()
export class OTPVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  otp: string;

  @Column()
  expires_at: Date;

  @Column({ nullable: true })
  lastSent: Date;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;
}
