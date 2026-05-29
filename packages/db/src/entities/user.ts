import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { UserRole } from '../types/user/roles';
import { Company } from './company';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STANDARD,
  })
  role: UserRole;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  google_id: string;

  @Column({ default: false })
  is_google_user: boolean;

  @Column({ nullable: true })
  github_id: string;

  @Column({ default: false })
  is_github_user: boolean;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ default: true })
  need_otp: boolean;

  @ManyToMany(() => Company, (company) => company.watchers)
  watchedCompanies: Company[];

  @CreateDateColumn()
  created_at: Date;
}
