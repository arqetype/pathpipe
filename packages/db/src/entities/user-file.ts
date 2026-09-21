import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user';
import { UserFileKind } from '../types/user-file/kind';

/**
 * The documents a job search runs on, kept in Postgres.
 *
 * Every CV, cover letter, diploma and certificate lives on this one table
 * rather than in object storage: the whole corpus of one user is a handful of
 * megabytes, and a row that is backed up, restored and deleted with the rest of
 * the database is worth more than the storage it saves. PDF only, because a
 * .docx renders differently on the reader's machine than on the writer's, and
 * an application is the wrong place to discover that.
 */
@Entity()
@Index(['user', 'kind'])
export class UserFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: UserFileKind })
  kind: UserFileKind;

  /** What the user calls it — "CV backend 2026", not "cv_v3_final(2).pdf". */
  @Column()
  name: string;

  /** The name it arrived under, kept for the download header. */
  @Column()
  filename: string;

  /** Size of the PDF itself, which is what a size shown to a user means. */
  @Column({ type: 'int' })
  byteSize: number;

  /** Size actually on the row, so the saving is measurable rather than assumed. */
  @Column({ type: 'int' })
  storedSize: number;

  /**
   * The gzipped PDF.
   *
   * `select: false` because listing documents must never drag megabytes of
   * bytea through the ORM — the download route asks for this column by name,
   * and nothing else ever should.
   */
  @Column({ type: 'bytea', select: false })
  content: Buffer;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
