import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../types/enums';

/** Buyers and vendors. Platform administrators live in `admins`. */
@Entity('users')
@Index('uq_users_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** Always stored lower-cased. */
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'text', select: false })
  password: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;

  @Column({ name: 'company_name', type: 'varchar', length: 200 })
  companyName: string;

  /** E.164, e.g. +919876543210 */
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
