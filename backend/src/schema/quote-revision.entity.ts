import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numberTransformer } from '../common/utils/transformers';
import { QuoteRevisionItem } from './quote-revision-item.entity';
import { Quote } from './quote.entity';

/** Immutable snapshot of a quote at one point in time. Never updated after insert. */
@Entity('quote_revisions')
@Index('uq_quote_revisions_no', ['quoteId', 'revisionNo'], { unique: true })
export class QuoteRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId: string;

  @ManyToOne(() => Quote, (quote) => quote.revisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column({ name: 'revision_no', type: 'int' })
  revisionNo: number;

  @Column({ name: 'total_minor', type: 'bigint', transformer: numberTransformer })
  totalMinor: number;

  @Column({ name: 'delivery_days', type: 'int' })
  deliveryDays: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => QuoteRevisionItem, (item) => item.revision)
  items: QuoteRevisionItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
