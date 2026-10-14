import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction } from '../types/enums';

/**
 * Append-only record of admin-panel writes. The admin's name and email are
 * snapshotted so the row stays meaningful after the account is deleted.
 */
@Entity('admin_audit_logs')
@Index('idx_admin_audit_logs_resource', ['resource', 'createdAt'])
@Index('idx_admin_audit_logs_created', ['createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string | null;

  @Column({ name: 'admin_name', type: 'varchar', length: 255 })
  adminName: string;

  @Column({ name: 'admin_email', type: 'varchar', length: 255 })
  adminEmail: string;

  @Column({ type: 'varchar', length: 10 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ name: 'record_id', type: 'varchar', length: 100, nullable: true })
  recordId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
