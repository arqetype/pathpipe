import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user';
import { Organization } from './organization';
import { OrganizationRole } from './organization-role';

@Entity()
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn()
  user: User;

  @ManyToOne(() => OrganizationRole, { nullable: false, eager: true })
  role: OrganizationRole;

  @ManyToOne(() => Organization, { eager: true, nullable: false })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;
}
