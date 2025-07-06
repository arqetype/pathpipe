import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { OrganizationMember } from './organization-member';
import { User } from '../user';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar_url: string;

  @OneToMany(() => OrganizationMember, (member) => member.organization, {
    nullable: false,
  })
  members: OrganizationMember[];

  @ManyToOne(() => User, { eager: true, nullable: false })
  owner: User;

  @CreateDateColumn()
  created_at: Date;
}
