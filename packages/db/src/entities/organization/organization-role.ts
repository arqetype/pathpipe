import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Organization } from './organization';

@Entity()
export class OrganizationRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isOwner: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @ManyToOne(() => Organization, { nullable: false })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;
}
