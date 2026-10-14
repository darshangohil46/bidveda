import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numberTransformer } from '../common/utils/transformers';
import { QuoteStatus } from '../types/enums';
import { QuoteRevision } from './quote-revision.entity';
import { Rfq } from './rfq.entity';
import { User } from './user.entity';

/**
 * One quote per vendor per RFQ. The row is the "current" view (status, latest
 * total, latest delivery days). Every submit/revise also writes an immutable
 * `quote_revisions` row, so earlier versions are never lost.
 */
@Entity('quotes')
@Index('uq_quotes_rfq_vendor', ['rfqId', 'vendorId'], { unique: true })
@Index('idx_quotes_vendor', ['vendorId'])
@Index('idx_quotes_rfq_total', ['rfqId', 'totalMinor'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rfq_id', type: 'uuid' })
  rfqId: string;

  @ManyToOne(() => Rfq, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ type: 'varchar', length: 20, default: QuoteStatus.SUBMITTED })
  status: QuoteStatus;

  @Column({ name: 'current_revision_no', type: 'int', default: 1 })
  currentRevisionNo: number;

  /** Denormalised from the latest revision so the comparison view can sort in SQL. */
  @Column({ name: 'total_minor', type: 'bigint', transformer: numberTransformer })
  totalMinor: number;

  @Column({ name: 'delivery_days', type: 'int' })
  deliveryDays: number;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @Column({ name: 'last_revised_at', type: 'timestamptz' })
  lastRevisedAt: Date;

  @OneToMany(() => QuoteRevision, (revision) => revision.quote)
  revisions: QuoteRevision[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
