import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user';
import { Organization } from './organization';
import { OrganizationRole } from './organization-role';

@Entity()
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @ManyToOne(() => OrganizationRole, { nullable: false, eager: true })
  role: OrganizationRole;

  @ManyToOne(() => Organization, { nullable: false })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  static uniqueUserOrganizationConstraint = {
    name: 'UQ_user_organization',
    columns: ['user', 'organization'],
  };
}
