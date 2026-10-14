import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quote } from './quote.entity';
import { Rfq } from './rfq.entity';
import { User } from './user.entity';

/**
 * A file attached to either an RFQ (buyer specification) or a quote (vendor
 * document). A CHECK constraint in the migration guarantees exactly one parent.
 * Bytes live on disk under a random name; this row holds the metadata.
 */
@Entity('attachments')
@Index('idx_attachments_rfq', ['rfqId'])
@Index('idx_attachments_quote', ['quoteId'])
@Index('uq_attachments_stored_name', ['storedName'], { unique: true })
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rfq_id', type: 'uuid', nullable: true })
  rfqId: string | null;

  @ManyToOne(() => Rfq, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq | null;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId: string | null;

  @ManyToOne(() => Quote, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote | null;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  /** Random name on disk, never derived from user input. */
  @Column({ name: 'stored_name', type: 'varchar', length: 100 })
  storedName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 150 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
