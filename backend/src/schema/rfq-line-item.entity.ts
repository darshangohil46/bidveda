import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numberTransformer } from '../common/utils/transformers';
import { Rfq } from './rfq.entity';

@Entity('rfq_line_items')
@Index('uq_rfq_line_items_position', ['rfqId', 'position'], { unique: true })
export class RfqLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rfq_id', type: 'uuid' })
  rfqId: string;

  @ManyToOne(() => Rfq, (rfq) => rfq.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  /** 1-based display order. */
  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** numeric(14,3) so fractional units (2.5 kg) are exact. */
  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numberTransformer })
  quantity: number;

  @Column({ type: 'varchar', length: 30 })
  unit: string;
}
