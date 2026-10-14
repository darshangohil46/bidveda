import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PermissionAction } from '../types/enums';

/** One row per (resource, CRUD action). Generated from the admin resource registry on boot. */
@Entity('permissions')
@Index('uq_permissions_table_action', ['tableKey', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'table_key', type: 'varchar', length: 100 })
  tableKey: string;

  @Column({ type: 'varchar', length: 10 })
  action: PermissionAction;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
