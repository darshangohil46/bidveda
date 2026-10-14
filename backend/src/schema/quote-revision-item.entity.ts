import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numberTransformer } from '../common/utils/transformers';
import { QuoteRevision } from './quote-revision.entity';
import { RfqLineItem } from './rfq-line-item.entity';

@Entity('quote_revision_items')
@Index('uq_quote_revision_items_line', ['revisionId', 'lineItemId'], { unique: true })
export class QuoteRevisionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'revision_id', type: 'uuid' })
  revisionId: string;

  @ManyToOne(() => QuoteRevision, (revision) => revision.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'revision_id' })
  revision: QuoteRevision;

  @Column({ name: 'line_item_id', type: 'uuid' })
  lineItemId: string;

  @ManyToOne(() => RfqLineItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'line_item_id' })
  lineItem: RfqLineItem;

  @Column({ name: 'unit_price_minor', type: 'bigint', transformer: numberTransformer })
  unitPriceMinor: number;

  /** round(quantity x unit price), computed by the server and stored so history never drifts. */
  @Column({ name: 'line_total_minor', type: 'bigint', transformer: numberTransformer })
  lineTotalMinor: number;
}
