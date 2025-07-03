import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
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

  @ManyToOne(() => Organization, { nullable: false, eager: true })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;
}
