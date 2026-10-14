import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import { DataSource, Repository } from 'typeorm';
import { MAX_ATTACHMENTS_PER_PARENT } from '../common/constants';
import { AppException } from '../common/errors/app.exception';
import { RfqLifecycleService } from '../history/rfq-lifecycle.service';
import { RfqAccessService } from '../rfqs/rfq-access.service';
import { Attachment, Quote } from '../schema';
import { FileStorageService } from '../storage/file-storage.service';
import { AuthUser } from '../types/auth.types';
import { RfqStatus, UserRole } from '../types/enums';
import { AttachmentView } from '../types/rfq.types';
import { toAttachmentView } from './attachment.view';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment) private readonly attachments: Repository<Attachment>,
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    private readonly dataSource: DataSource,
    private readonly access: RfqAccessService,
    private readonly lifecycle: RfqLifecycleService,
    private readonly storage: FileStorageService,
  ) {}

  /** Buyer attaches a specification file to their own RFQ (while it is a draft or open). */
  async uploadToRfq(
    user: AuthUser,
    rfqId: string,
    file: Express.Multer.File | undefined,
  ): Promise<AttachmentView> {
    const rfq = await this.access.loadOwned(user, rfqId);
    const now = await this.lifecycle.dbNow(this.dataSource.manager);
    const open =
      rfq.status === RfqStatus.DRAFT ||
      (rfq.status === RfqStatus.PUBLISHED && rfq.deadline.getTime() > now.getTime());
    if (!open) {
      throw AppException.conflict('RFQ_LOCKED', 'Files can no longer be added to this RFQ.');
    }
    await this.assertRoom({ rfqId });
    return this.persist({ rfqId, quoteId: null }, user, file);
  }

  /** Vendor attaches a document to their own quote, until the RFQ deadline. */
  async uploadToQuote(
    user: AuthUser,
    quoteId: string,
    file: Express.Multer.File | undefined,
  ): Promise<AttachmentView> {
    const quote = await this.quotes.findOne({
      where: { id: quoteId, vendorId: user.id },
      relations: { rfq: true },
    });
    if (!quote) throw AppException.notFound('Quote not found');
    await this.assertQuoteEditable(quote);
    await this.assertRoom({ quoteId });
    return this.persist({ rfqId: null, quoteId }, user, file);
  }

  /** Streams a file after checking the caller may see its parent RFQ or quote. */
  async openForDownload(
    user: AuthUser,
    id: string,
  ): Promise<{ stream: ReadStream; attachment: Attachment }> {
    const attachment = await this.attachments.findOneBy({ id });
    if (!attachment) throw AppException.notFound('File not found');
    await this.assertCanRead(user, attachment);
    return { stream: await this.storage.open(attachment.storedName), attachment };
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const attachment = await this.attachments.findOneBy({ id, uploadedById: user.id });
    if (!attachment) throw AppException.notFound('File not found');

    if (attachment.quoteId) {
      const quote = await this.quotes.findOne({
        where: { id: attachment.quoteId },
        relations: { rfq: true },
      });
      if (quote) await this.assertQuoteEditable(quote);
    } else if (attachment.rfqId) {
      const rfq = await this.access.loadOwned(user, attachment.rfqId);
      if (rfq.status !== RfqStatus.DRAFT && rfq.status !== RfqStatus.PUBLISHED) {
        throw AppException.conflict('RFQ_LOCKED', 'Files can no longer be removed from this RFQ.');
      }
    }

    await this.attachments.delete(id);
    await this.storage.remove(attachment.storedName);
  }

  // ------------------------------------------------------------------ internals
  private async persist(
    parent: { rfqId: string | null; quoteId: string | null },
    user: AuthUser,
    file: Express.Multer.File | undefined,
  ): Promise<AttachmentView> {
    const stored = await this.storage.save(file);
    try {
      const row = await this.attachments.save(
        this.attachments.create({
          ...parent,
          uploadedById: user.id,
          originalName: stored.originalName,
          storedName: stored.storedName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
        }),
      );
      return toAttachmentView(row);
    } catch (error) {
      await this.storage.remove(stored.storedName);
      throw error;
    }
  }

  private async assertRoom(parent: { rfqId?: string; quoteId?: string }): Promise<void> {
    const count = await this.attachments.count({ where: parent });
    if (count >= MAX_ATTACHMENTS_PER_PARENT) {
      throw AppException.conflict(
        'TOO_MANY_FILES',
        `At most ${MAX_ATTACHMENTS_PER_PARENT} files can be attached.`,
      );
    }
  }

  private async assertQuoteEditable(quote: Quote & { rfq: { status: RfqStatus; deadline: Date } }) {
    const now = await this.lifecycle.dbNow(this.dataSource.manager);
    if (quote.rfq.status !== RfqStatus.PUBLISHED || quote.rfq.deadline.getTime() <= now.getTime()) {
      throw AppException.conflict(
        'DEADLINE_PASSED',
        'The submission deadline has passed. Quote files can no longer be changed.',
      );
    }
  }

  private async assertCanRead(user: AuthUser, attachment: Attachment): Promise<void> {
    if (attachment.rfqId) {
      await this.access.loadVisible(user, attachment.rfqId);
      return;
    }
    const quote = await this.quotes.findOne({
      where: { id: attachment.quoteId ?? '' },
      relations: { rfq: true },
    });
    const allowed =
      quote &&
      (user.role === UserRole.VENDOR ? quote.vendorId === user.id : quote.rfq.buyerId === user.id);
    if (!allowed) throw AppException.notFound('File not found');
  }
}
