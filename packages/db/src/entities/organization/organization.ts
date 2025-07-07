import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { OrganizationMember } from './organization-member';
import { OrganizationRole } from './organization-role';
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

  @ManyToOne(() => User, { eager: true, nullable: false })
  owner: User;

  @OneToMany(() => OrganizationMember, (member) => member.organization, {
    cascade: true,
  })
  members: OrganizationMember[];

  @OneToMany(() => OrganizationRole, (role) => role.organization, {
    cascade: true,
  })
  roles: OrganizationRole[];

  @CreateDateColumn()
  created_at: Date;
}
