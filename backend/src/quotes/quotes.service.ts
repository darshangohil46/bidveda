import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { toAttachmentView } from '../attachments/attachment.view';
import { AppException } from '../common/errors/app.exception';
import { lineTotalMinor, sumMinor } from '../common/utils/money';
import { toPage } from '../common/utils/pagination';
import { RfqLifecycleService } from '../history/rfq-lifecycle.service';
import { StatusHistoryService, userActor } from '../history/status-history.service';
import { MailService } from '../mail/mail.service';
import { RfqAccessService } from '../rfqs/rfq-access.service';
import {
  Attachment,
  Quote,
  QuoteRevision,
  QuoteRevisionItem,
  Rfq,
  RfqLineItem,
  User,
} from '../schema';
import { AuthUser } from '../types/auth.types';
import { Paginated } from '../types/common.types';
import { ComparisonSort, QuoteStatus, RfqStatus, UserRole } from '../types/enums';
import {
  AwardResult,
  ComparisonView,
  MyQuoteListItem,
  PricedLine,
  QuoteItemView,
  QuoteView,
} from '../types/rfq.types';
import { AwardDto, ListMyQuotesQueryDto, UpsertQuoteDto } from './dto/quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    @InjectRepository(QuoteRevision) private readonly revisions: Repository<QuoteRevision>,
    @InjectRepository(Attachment) private readonly attachments: Repository<Attachment>,
    @InjectRepository(RfqLineItem) private readonly lineItems: Repository<RfqLineItem>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly access: RfqAccessService,
    private readonly lifecycle: RfqLifecycleService,
    private readonly statusHistory: StatusHistoryService,
    private readonly mail: MailService,
  ) {}

  // ------------------------------------------------------------ vendor: submit
  /**
   * Submit or revise the vendor's quote. One endpoint, idempotent:
   *  - first call creates the quote and revision 1
   *  - later calls add revision N+1 (older revisions are kept, never edited)
   *  - a call that changes nothing creates nothing
   * The RFQ row is share-locked, so a submission and an award can never interleave.
   */
  async upsertMine(user: AuthUser, rfqId: string, dto: UpsertQuoteDto): Promise<QuoteView> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const rfq = await manager.findOne(Rfq, {
        where: { id: rfqId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!rfq || rfq.status === RfqStatus.DRAFT) throw AppException.notFound('RFQ not found');

      const now = await this.lifecycle.dbNow(manager);
      if (rfq.deadline.getTime() <= now.getTime()) {
        throw AppException.conflict(
          'DEADLINE_PASSED',
          'The submission deadline has passed. Quotes can no longer be submitted or changed.',
          { deadline: rfq.deadline.toISOString() },
        );
      }
      if (rfq.status !== RfqStatus.PUBLISHED) {
        throw AppException.conflict('RFQ_NOT_OPEN', 'This RFQ is not open for quotes.');
      }

      const lineItems = await manager.find(RfqLineItem, {
        where: { rfqId },
        order: { position: 'ASC' },
      });
      const priced = this.priceLines(lineItems, dto);
      const totalMinor = sumMinor([...priced.values()].map((line) => line.lineTotalMinor));
      const notes = dto.notes?.trim() ? dto.notes.trim() : null;

      let quote = await manager.findOne(Quote, {
        where: { rfqId, vendorId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      let changed = true;
      let isRevision = false;

      if (!quote) {
        quote = await manager.save(
          manager.create(Quote, {
            rfqId,
            vendorId: user.id,
            status: QuoteStatus.SUBMITTED,
            currentRevisionNo: 1,
            totalMinor,
            deliveryDays: dto.deliveryDays,
            submittedAt: now,
            lastRevisedAt: now,
          }),
        );
        await this.insertRevision(
          manager,
          quote.id,
          1,
          totalMinor,
          dto.deliveryDays,
          notes,
          priced,
        );
        await this.statusHistory.record(manager, {
          rfqId,
          quoteId: quote.id,
          from: null,
          to: QuoteStatus.SUBMITTED,
          actor: userActor(user),
          note: 'Quote submitted',
        });
      } else {
        const current = await manager.findOne(QuoteRevision, {
          where: { quoteId: quote.id, revisionNo: quote.currentRevisionNo },
          relations: { items: true },
        });
        if (current && this.isSameContent(current, dto.deliveryDays, notes, priced)) {
          changed = false;
        } else {
          isRevision = true;
          const nextNo = quote.currentRevisionNo + 1;
          await this.insertRevision(
            manager,
            quote.id,
            nextNo,
            totalMinor,
            dto.deliveryDays,
            notes,
            priced,
          );
          await manager.update(Quote, quote.id, {
            currentRevisionNo: nextNo,
            totalMinor,
            deliveryDays: dto.deliveryDays,
            lastRevisedAt: now,
          });
        }
      }

      return {
        quoteId: quote.id,
        changed,
        isRevision,
        buyerId: rfq.buyerId,
        rfqTitle: rfq.title,
        currency: rfq.currency,
        totalMinor,
      };
    });

    if (outcome.changed) {
      void this.notifyBuyer(user, outcome);
    }
    const quote = await this.quotes.findOneByOrFail({ id: outcome.quoteId });
    const [view] = await this.toViews([quote], { revisions: true });
    return view;
  }

  async getMine(user: AuthUser, rfqId: string): Promise<{ quote: QuoteView | null }> {
    const quote = await this.quotes.findOne({ where: { rfqId, vendorId: user.id } });
    if (!quote) return { quote: null };
    const [view] = await this.toViews([quote], { revisions: true });
    return { quote: view };
  }

  async listMine(user: AuthUser, query: ListMyQuotesQueryDto): Promise<Paginated<MyQuoteListItem>> {
    await this.lifecycle.closeExpired();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.quotes
      .createQueryBuilder('q')
      .innerJoin('q.rfq', 'r')
      .innerJoin('r.buyer', 'b')
      .addSelect([
        'r.id',
        'r.title',
        'r.status',
        'r.deadline',
        'r.currency',
        'b.id',
        'b.companyName',
      ])
      .where('q.vendorId = :uid', { uid: user.id });
    if (query.status) qb.andWhere('q.status = :status', { status: query.status });

    const [rows, total] = await qb
      .orderBy('q.lastRevisedAt', 'DESC')
      .addOrderBy('q.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = rows.map((row) => ({
      id: row.id,
      status: row.status,
      totalMinor: row.totalMinor,
      deliveryDays: row.deliveryDays,
      revisionNo: row.currentRevisionNo,
      submittedAt: row.submittedAt,
      lastRevisedAt: row.lastRevisedAt,
      rfq: {
        id: row.rfq.id,
        title: row.rfq.title,
        status: row.rfq.status,
        deadline: row.rfq.deadline,
        currency: row.rfq.currency,
        buyerCompany: row.rfq.buyer.companyName,
      },
    }));
    return toPage(items, total, page, limit);
  }

  /** One quote. The vendor who wrote it or the buyer who owns the RFQ; nobody else (404). */
  async getQuote(user: AuthUser, quoteId: string): Promise<QuoteView> {
    const quote = await this.quotes.findOne({
      where: { id: quoteId },
      relations: { rfq: true, vendor: true },
    });
    const allowed =
      quote &&
      (user.role === UserRole.VENDOR ? quote.vendorId === user.id : quote.rfq.buyerId === user.id);
    if (!quote || !allowed) throw AppException.notFound('Quote not found');

    const [view] = await this.toViews([quote], {
      revisions: true,
      vendor: user.role === UserRole.BUYER,
    });
    return view;
  }

  // ------------------------------------------------------------ buyer: compare
  async comparison(
    user: AuthUser,
    rfqId: string,
    sort: ComparisonSort = ComparisonSort.TOTAL_ASC,
  ): Promise<ComparisonView> {
    await this.access.loadOwned(user, rfqId);
    await this.lifecycle.closeExpired(undefined, rfqId);
    const rfq = await this.dataSource.getRepository(Rfq).findOneByOrFail({ id: rfqId });
    const lineItems = await this.lineItems.find({ where: { rfqId }, order: { position: 'ASC' } });

    const qb = this.quotes
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.vendor', 'v')
      .where('q.rfqId = :rfqId', { rfqId });
    this.applyComparisonSort(qb, sort);
    const rows = await qb.getMany();
    const quotes = await this.toViews(rows, { vendor: true, revisions: true });

    return {
      rfq: {
        id: rfq.id,
        title: rfq.title,
        status: rfq.status,
        deadline: rfq.deadline,
        currency: rfq.currency,
        budgetMinor: rfq.budgetMinor,
        awardedQuoteId: rfq.awardedQuoteId,
        lineItems: lineItems.map((item) => ({
          id: item.id,
          position: item.position,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
      quotes,
      sort,
    };
  }

  /** SUBMITTED -> SHORTLISTED. Only after the deadline, only by the owning buyer. */
  async shortlist(user: AuthUser, rfqId: string, quoteId: string): Promise<QuoteView> {
    await this.dataSource.transaction(async (manager) => {
      const rfq = await this.lockOwnedClosed(manager, user, rfqId);
      const quote = await manager.findOne(Quote, { where: { id: quoteId, rfqId: rfq.id } });
      if (!quote) throw AppException.notFound('Quote not found on this RFQ');
      if (quote.status !== QuoteStatus.SUBMITTED) {
        throw AppException.conflict(
          'INVALID_QUOTE_TRANSITION',
          `A ${quote.status.toLowerCase()} quote cannot be shortlisted.`,
        );
      }
      await manager.update(Quote, quote.id, { status: QuoteStatus.SHORTLISTED });
      await this.statusHistory.record(manager, {
        rfqId,
        quoteId: quote.id,
        from: QuoteStatus.SUBMITTED,
        to: QuoteStatus.SHORTLISTED,
        actor: userActor(user),
        note: 'Quote shortlisted',
      });
    });
    return this.getQuote(user, quoteId);
  }

  /**
   * Award: chosen quote -> ACCEPTED, every other quote -> REJECTED, RFQ -> AWARDED,
   * and a history row for each change, all in one transaction under a write lock on the RFQ.
   */
  async award(user: AuthUser, rfqId: string, dto: AwardDto): Promise<AwardResult> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const rfq = await this.lockOwnedClosed(manager, user, rfqId);
      const quotes = await manager.find(Quote, { where: { rfqId }, order: { id: 'ASC' } });
      const winner = quotes.find((quote) => quote.id === dto.quoteId);
      if (!winner) throw AppException.notFound('Quote not found on this RFQ');

      const actor = userActor(user);
      const awardedAt = new Date();
      for (const quote of quotes) {
        const accepted = quote.id === winner.id;
        const to = accepted ? QuoteStatus.ACCEPTED : QuoteStatus.REJECTED;
        await manager.update(Quote, quote.id, { status: to });
        await this.statusHistory.record(manager, {
          rfqId,
          quoteId: quote.id,
          from: quote.status,
          to,
          actor,
          note: accepted ? (dto.note ?? 'Quote accepted') : 'Another vendor was awarded',
        });
      }

      await manager.update(Rfq, rfqId, {
        status: RfqStatus.AWARDED,
        awardedQuoteId: winner.id,
        awardedAt,
      });
      await this.statusHistory.record(manager, {
        rfqId,
        from: RfqStatus.CLOSED,
        to: RfqStatus.AWARDED,
        actor,
        note: dto.note ?? 'RFQ awarded',
      });

      return { rfq, quotes, winner, awardedAt };
    });

    void this.notifyVendors(outcome.rfq, outcome.quotes, outcome.winner.id);
    return {
      rfqId,
      status: RfqStatus.AWARDED,
      awardedQuoteId: outcome.winner.id,
      awardedAt: outcome.awardedAt,
    };
  }

  // ------------------------------------------------------------------ internals
  /** Write-locks the buyer's RFQ and requires it to be CLOSED (deadline passed, not yet awarded). */
  private async lockOwnedClosed(
    manager: EntityManager,
    user: AuthUser,
    rfqId: string,
  ): Promise<Rfq> {
    const locked = await manager.findOne(Rfq, {
      where: { id: rfqId, buyerId: user.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw AppException.notFound('RFQ not found');

    await this.lifecycle.closeExpired(manager, rfqId);
    const rfq = await manager.findOneByOrFail(Rfq, { id: rfqId });
    if (rfq.status === RfqStatus.AWARDED) {
      throw AppException.conflict('RFQ_ALREADY_AWARDED', 'This RFQ has already been awarded.');
    }
    if (rfq.status !== RfqStatus.CLOSED) {
      throw AppException.conflict(
        'RFQ_NOT_CLOSED',
        'You can shortlist or award quotes once the submission deadline has passed.',
      );
    }
    return rfq;
  }

  private priceLines(lineItems: RfqLineItem[], dto: UpsertQuoteDto): Map<string, PricedLine> {
    const byId = new Map(lineItems.map((item) => [item.id, item]));
    const priced = new Map<string, PricedLine>();

    for (const entry of dto.items) {
      const item = byId.get(entry.lineItemId);
      if (!item) {
        throw AppException.badRequest(
          'UNKNOWN_LINE_ITEM',
          'A price refers to a line item that is not on this RFQ.',
          {
            lineItemId: entry.lineItemId,
          },
        );
      }
      if (priced.has(entry.lineItemId)) {
        throw AppException.badRequest(
          'DUPLICATE_LINE_ITEM',
          'Each line item can be priced only once.',
          {
            lineItemId: entry.lineItemId,
          },
        );
      }
      priced.set(entry.lineItemId, {
        unitPriceMinor: entry.unitPriceMinor,
        lineTotalMinor: lineTotalMinor(item.quantity, entry.unitPriceMinor),
      });
    }

    const missing = lineItems.filter((item) => !priced.has(item.id));
    if (missing.length > 0) {
      throw AppException.badRequest('MISSING_LINE_ITEM_PRICE', 'Every line item needs a price.', {
        missing: missing.map((item) => item.name),
      });
    }
    return priced;
  }

  private async insertRevision(
    manager: EntityManager,
    quoteId: string,
    revisionNo: number,
    totalMinor: number,
    deliveryDays: number,
    notes: string | null,
    priced: Map<string, PricedLine>,
  ): Promise<void> {
    const revision = await manager.save(
      manager.create(QuoteRevision, { quoteId, revisionNo, totalMinor, deliveryDays, notes }),
    );
    await manager.insert(
      QuoteRevisionItem,
      [...priced.entries()].map(([lineItemId, line]) => ({
        revisionId: revision.id,
        lineItemId,
        unitPriceMinor: line.unitPriceMinor,
        lineTotalMinor: line.lineTotalMinor,
      })),
    );
  }

  private isSameContent(
    current: QuoteRevision,
    deliveryDays: number,
    notes: string | null,
    priced: Map<string, PricedLine>,
  ): boolean {
    if (current.deliveryDays !== deliveryDays) return false;
    if ((current.notes ?? null) !== notes) return false;
    if (current.items.length !== priced.size) return false;
    return current.items.every(
      (item) => priced.get(item.lineItemId)?.unitPriceMinor === item.unitPriceMinor,
    );
  }

  private applyComparisonSort(
    qb: ReturnType<Repository<Quote>['createQueryBuilder']>,
    sort: ComparisonSort,
  ): void {
    switch (sort) {
      case ComparisonSort.TOTAL_DESC:
        qb.orderBy('q.totalMinor', 'DESC').addOrderBy('q.deliveryDays', 'ASC');
        break;
      case ComparisonSort.DELIVERY_ASC:
        qb.orderBy('q.deliveryDays', 'ASC').addOrderBy('q.totalMinor', 'ASC');
        break;
      case ComparisonSort.DELIVERY_DESC:
        qb.orderBy('q.deliveryDays', 'DESC').addOrderBy('q.totalMinor', 'ASC');
        break;
      case ComparisonSort.SUBMITTED_ASC:
        qb.orderBy('q.submittedAt', 'ASC');
        break;
      default:
        qb.orderBy('q.totalMinor', 'ASC').addOrderBy('q.deliveryDays', 'ASC');
    }
    qb.addOrderBy('q.submittedAt', 'ASC').addOrderBy('q.id', 'ASC');
  }

  /** Builds API views for many quotes with two extra queries total (revisions, attachments). */
  private async toViews(
    quotes: Quote[],
    options: { revisions?: boolean; vendor?: boolean } = {},
  ): Promise<QuoteView[]> {
    if (quotes.length === 0) return [];
    const ids = quotes.map((quote) => quote.id);

    const [revisionRows, attachmentRows] = await Promise.all([
      this.revisions.find({
        where: { quoteId: In(ids) },
        relations: { items: true },
        order: { revisionNo: 'ASC' },
      }),
      this.attachments.find({ where: { quoteId: In(ids) }, order: { createdAt: 'ASC' } }),
    ]);

    return quotes.map((quote) => {
      const own = revisionRows.filter((revision) => revision.quoteId === quote.id);
      const current = own.find((revision) => revision.revisionNo === quote.currentRevisionNo);
      const view: QuoteView = {
        id: quote.id,
        rfqId: quote.rfqId,
        status: quote.status,
        revisionNo: quote.currentRevisionNo,
        totalMinor: quote.totalMinor,
        deliveryDays: quote.deliveryDays,
        notes: current?.notes ?? null,
        submittedAt: quote.submittedAt,
        lastRevisedAt: quote.lastRevisedAt,
        items: (current?.items ?? []).map((item) => this.toItemView(item)),
        attachments: attachmentRows
          .filter((file) => file.quoteId === quote.id)
          .map(toAttachmentView),
      };
      if (options.vendor && quote.vendor) {
        view.vendor = {
          id: quote.vendor.id,
          name: quote.vendor.name,
          companyName: quote.vendor.companyName,
          email: quote.vendor.email,
          phone: quote.vendor.phone,
        };
      }
      if (options.revisions) {
        view.revisions = own.map((revision) => ({
          revisionNo: revision.revisionNo,
          totalMinor: revision.totalMinor,
          deliveryDays: revision.deliveryDays,
          notes: revision.notes,
          createdAt: revision.createdAt,
          items: revision.items.map((item) => this.toItemView(item)),
        }));
      }
      return view;
    });
  }

  private toItemView(item: QuoteRevisionItem): QuoteItemView {
    return {
      lineItemId: item.lineItemId,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
    };
  }

  // ----------------------------------------------------------------- email hooks
  private async notifyBuyer(
    vendor: AuthUser,
    outcome: {
      quoteId: string;
      buyerId: string;
      rfqTitle: string;
      currency: string;
      totalMinor: number;
      isRevision: boolean;
    },
  ): Promise<void> {
    const [buyer, quote, vendorUser] = await Promise.all([
      this.users.findOneBy({ id: outcome.buyerId }),
      this.quotes.findOneBy({ id: outcome.quoteId }),
      this.users.findOneBy({ id: vendor.id }),
    ]);
    if (!buyer || !quote || !vendorUser) return;
    this.mail.sendNewQuote(buyer.email, {
      rfqId: quote.rfqId,
      rfqTitle: outcome.rfqTitle,
      vendorCompany: vendorUser.companyName,
      totalMinor: outcome.totalMinor,
      currency: outcome.currency,
      deliveryDays: quote.deliveryDays,
      isRevision: outcome.isRevision,
    });
  }

  private async notifyVendors(rfq: Rfq, quotes: Quote[], winnerId: string): Promise<void> {
    const vendors = await this.users.find({
      where: { id: In(quotes.map((quote) => quote.vendorId)) },
    });
    const byId = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    for (const quote of quotes) {
      const vendor = byId.get(quote.vendorId);
      if (!vendor) continue;
      if (quote.id === winnerId) {
        this.mail.sendAwarded(vendor.email, {
          rfqId: rfq.id,
          rfqTitle: rfq.title,
          vendorName: vendor.name,
          totalMinor: quote.totalMinor,
          currency: rfq.currency,
        });
      } else {
        this.mail.sendRejected(vendor.email, {
          rfqId: rfq.id,
          rfqTitle: rfq.title,
          vendorName: vendor.name,
        });
      }
    }
  }
}
