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
import { RfqStatus } from '../types/enums';
import { RfqLineItem } from './rfq-line-item.entity';
import { User } from './user.entity';

@Entity('rfqs')
@Index('idx_rfqs_buyer_status', ['buyerId', 'status'])
@Index('idx_rfqs_status_deadline', ['status', 'deadline'])
@Index('idx_rfqs_category', ['category'])
export class Rfq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ name: 'delivery_address', type: 'varchar', length: 300, nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'delivery_city', type: 'varchar', length: 120 })
  deliveryCity: string;

  @Column({ name: 'delivery_state', type: 'varchar', length: 120 })
  deliveryState: string;

  @Column({ name: 'delivery_country', type: 'varchar', length: 120 })
  deliveryCountry: string;

  @Column({ name: 'delivery_pincode', type: 'varchar', length: 20 })
  deliveryPincode: string;

  /** Optional budget in minor units (paise). */
  @Column({
    name: 'budget_minor',
    type: 'bigint',
    nullable: true,
    transformer: numberTransformer,
  })
  budgetMinor: number | null;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency: string;

  @Column({ type: 'timestamptz' })
  deadline: Date;

  @Column({ type: 'varchar', length: 20, default: RfqStatus.DRAFT })
  status: RfqStatus;

  /** Set when awarded. The FK to quotes is created in the migration (circular reference). */
  @Column({ name: 'awarded_quote_id', type: 'uuid', nullable: true })
  awardedQuoteId: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'awarded_at', type: 'timestamptz', nullable: true })
  awardedAt: Date | null;

  @OneToMany(() => RfqLineItem, (item) => item.rfq)
  lineItems: RfqLineItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
