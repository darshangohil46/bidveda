import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActorType } from '../types/enums';
import { Quote } from './quote.entity';
import { Rfq } from './rfq.entity';

/**
 * Append-only status trail for RFQs and quotes. `quote_id` is null for RFQ-level
 * events. Both ids are real foreign keys, so a history row can never dangle.
 */
@Entity('status_history')
@Index('idx_status_history_rfq', ['rfqId', 'createdAt'])
export class StatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rfq_id', type: 'uuid' })
  rfqId: string;

  @ManyToOne(() => Rfq, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId: string | null;

  @ManyToOne(() => Quote, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote | null;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 10 })
  actorType: ActorType;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /** Snapshot of the actor's name at the time. */
  @Column({ name: 'actor_name', type: 'varchar', length: 200, nullable: true })
  actorName: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
