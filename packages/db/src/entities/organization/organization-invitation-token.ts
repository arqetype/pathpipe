import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization';
import { OrganizationRole } from './organization-role';

@Entity()
export class OrganizationInvitationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  expires_at: Date;

  @Column({ nullable: true })
  lastSent: Date;

  @Column({ nullable: false })
  email: string;

  @OneToOne(() => Organization)
  @JoinColumn()
  organization: Organization;

  @OneToOne(() => OrganizationRole)
  @JoinColumn()
  role: OrganizationRole;
}
