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
import { AdminRole } from './admin-role.entity';

@Entity('admins')
@Index('uq_admins_email', ['email'], { unique: true })
@Index('idx_admins_role', ['roleId'])
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'text', select: false })
  password: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => AdminRole, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: AdminRole;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Name of the uploaded picture (`<uuid>.png`), not a web address. Served by `GET admin/uploads/images/:name`. */
  @Column({ name: 'avatar_url', type: 'varchar', length: 1000, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
