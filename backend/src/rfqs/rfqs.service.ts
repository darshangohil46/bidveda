import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { toAttachmentView } from '../attachments/attachment.view';
import { AppException } from '../common/errors/app.exception';
import { escapeLike, toPage } from '../common/utils/pagination';
import { RfqLifecycleService } from '../history/rfq-lifecycle.service';
import { StatusHistoryService, userActor } from '../history/status-history.service';
import { Attachment, Quote, Rfq, RfqLineItem, StatusHistory } from '../schema';
import { FileStorageService } from '../storage/file-storage.service';
import { AuthUser } from '../types/auth.types';
import { RfqSort, RfqStatus, UserRole } from '../types/enums';
import {
  LineItemView,
  MyQuoteSummary,
  RfqDetailView,
  RfqListItem,
  RfqListResult,
  StatusHistoryView,
} from '../types/rfq.types';
import { CreateRfqDto, LineItemDto, ListRfqsQueryDto, UpdateRfqDto } from './dto/rfq.dto';
import { RfqAccessService } from './rfq-access.service';

@Injectable()
export class RfqsService {
  constructor(
    @InjectRepository(Rfq) private readonly rfqs: Repository<Rfq>,
    @InjectRepository(RfqLineItem) private readonly lineItems: Repository<RfqLineItem>,
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    @InjectRepository(Attachment) private readonly attachments: Repository<Attachment>,
    @InjectRepository(StatusHistory) private readonly history: Repository<StatusHistory>,
    private readonly dataSource: DataSource,
    private readonly access: RfqAccessService,
    private readonly lifecycle: RfqLifecycleService,
    private readonly statusHistory: StatusHistoryService,
    private readonly storage: FileStorageService,
  ) {}

  // ------------------------------------------------------------------ commands
  async create(user: AuthUser, dto: CreateRfqDto): Promise<RfqDetailView> {
    const deadline = this.parseFutureDeadline(dto.deadline);

    const id = await this.dataSource.transaction(async (manager) => {
      const rfq = await manager.save(
        manager.create(Rfq, {
          buyerId: user.id,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          deliveryAddress: dto.deliveryAddress || null,
          deliveryCity: dto.deliveryCity,
          deliveryState: dto.deliveryState,
          deliveryCountry: dto.deliveryCountry,
          deliveryPincode: dto.deliveryPincode,
          budgetMinor: dto.budgetMinor ?? null,
          deadline,
          status: RfqStatus.DRAFT,
        }),
      );
      await this.insertLineItems(manager, rfq.id, dto.lineItems);
      await this.statusHistory.record(manager, {
        rfqId: rfq.id,
        from: null,
        to: RfqStatus.DRAFT,
        actor: userActor(user),
        note: 'RFQ created',
      });
      return rfq.id;
    });
    return this.getDetail(user, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateRfqDto): Promise<RfqDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const rfq = await this.lockOwned(manager, user, id);
      await this.assertEditable(manager, rfq);

      const patch: Partial<Rfq> = {};
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.category !== undefined) patch.category = dto.category;
      if (dto.deliveryAddress !== undefined) patch.deliveryAddress = dto.deliveryAddress || null;
      if (dto.deliveryCity !== undefined) patch.deliveryCity = dto.deliveryCity;
      if (dto.deliveryState !== undefined) patch.deliveryState = dto.deliveryState;
      if (dto.deliveryCountry !== undefined) patch.deliveryCountry = dto.deliveryCountry;
      if (dto.deliveryPincode !== undefined) patch.deliveryPincode = dto.deliveryPincode;
      if (dto.budgetMinor !== undefined) patch.budgetMinor = dto.budgetMinor;
      if (dto.deadline !== undefined) patch.deadline = this.parseFutureDeadline(dto.deadline);

      if (Object.keys(patch).length > 0) await manager.update(Rfq, id, patch);
      if (dto.lineItems !== undefined) await this.replaceLineItems(manager, id, dto.lineItems);
    });
    return this.getDetail(user, id);
  }

  async publish(user: AuthUser, id: string): Promise<RfqDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const rfq = await this.lockOwned(manager, user, id);
      if (rfq.status !== RfqStatus.DRAFT) {
        throw AppException.conflict('RFQ_NOT_DRAFT', 'Only a draft RFQ can be published.');
      }
      if (rfq.deadline.getTime() <= (await this.lifecycle.dbNow(manager)).getTime()) {
        throw AppException.badRequest(
          'DEADLINE_IN_PAST',
          'The deadline is in the past. Edit the RFQ and choose a later deadline.',
        );
      }
      const itemCount = await manager.count(RfqLineItem, { where: { rfqId: id } });
      if (itemCount === 0) {
        throw AppException.badRequest(
          'NO_LINE_ITEMS',
          'Add at least one line item before publishing.',
        );
      }

      await manager.update(Rfq, id, { status: RfqStatus.PUBLISHED, publishedAt: new Date() });
      await this.statusHistory.record(manager, {
        rfqId: id,
        from: RfqStatus.DRAFT,
        to: RfqStatus.PUBLISHED,
        actor: userActor(user),
        note: 'RFQ published to vendors',
      });
    });
    return this.getDetail(user, id);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const storedNames = await this.dataSource.transaction(async (manager) => {
      const rfq = await this.lockOwned(manager, user, id);
      if (rfq.status !== RfqStatus.DRAFT) {
        throw AppException.conflict('RFQ_NOT_EDITABLE', 'Only a draft RFQ can be deleted.');
      }
      const files = await manager.find(Attachment, { where: { rfqId: id } });
      await manager.delete(Rfq, id);
      return files.map((file) => file.storedName);
    });
    await this.storage.removeMany(storedNames);
  }

  // --------------------------------------------------------------------- reads
  async list(user: AuthUser, query: ListRfqsQueryDto): Promise<RfqListResult> {
    await this.lifecycle.closeExpired();
    return user.role === UserRole.BUYER
      ? this.listForBuyer(user, query)
      : this.listForVendor(user, query);
  }

  async getDetail(user: AuthUser, id: string): Promise<RfqDetailView> {
    const rfq = await this.access.loadVisible(user, id);
    const attachments = await this.attachments.find({
      where: { rfqId: id },
      order: { createdAt: 'ASC' },
    });

    const view: RfqDetailView = {
      id: rfq.id,
      title: rfq.title,
      description: rfq.description,
      category: rfq.category,
      status: rfq.status,
      deadline: rfq.deadline,
      deliveryAddress: rfq.deliveryAddress,
      deliveryCity: rfq.deliveryCity,
      deliveryState: rfq.deliveryState,
      deliveryCountry: rfq.deliveryCountry,
      deliveryPincode: rfq.deliveryPincode,
      budgetMinor: rfq.budgetMinor,
      currency: rfq.currency,
      publishedAt: rfq.publishedAt,
      awardedAt: rfq.awardedAt,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      buyerCompany: rfq.buyer.companyName,
      lineItems: rfq.lineItems.map((item) => this.toLineItemView(item)),
      attachments: attachments.map(toAttachmentView),
      serverTime: new Date(),
    };

    if (user.role === UserRole.BUYER) {
      view.quoteCount = await this.quotes.count({ where: { rfqId: id } });
      view.awardedQuoteId = rfq.awardedQuoteId;
    } else {
      const mine = await this.quotes.findOne({ where: { rfqId: id, vendorId: user.id } });
      view.myQuote = mine ? this.toQuoteSummary(mine) : null;
    }
    return view;
  }

  /** Status trail. Buyers see every event; vendors see RFQ events and their own quote's events. */
  async getHistory(user: AuthUser, id: string): Promise<StatusHistoryView[]> {
    await this.access.loadVisible(user, id);

    const qb = this.history
      .createQueryBuilder('h')
      .leftJoin('h.quote', 'q')
      .leftJoin('q.vendor', 'v')
      .addSelect(['q.id', 'q.vendorId', 'v.id', 'v.companyName'])
      .where('h.rfqId = :id', { id })
      .orderBy('h.createdAt', 'ASC')
      .addOrderBy('h.id', 'ASC');

    if (user.role === UserRole.VENDOR) {
      qb.andWhere('(h.quoteId IS NULL OR q.vendorId = :uid)', { uid: user.id });
    }

    const rows = await qb.getMany();
    return rows.map((row) => ({
      id: row.id,
      quoteId: row.quoteId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      actorType: row.actorType,
      actorName: row.actorName,
      note: row.note,
      createdAt: row.createdAt,
      ...(user.role === UserRole.BUYER && row.quote
        ? { vendorCompany: row.quote.vendor.companyName }
        : {}),
    }));
  }

  // ------------------------------------------------------------------ internals
  private async listForBuyer(user: AuthUser, query: ListRfqsQueryDto): Promise<RfqListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.rfqs.createQueryBuilder('r').where('r.buyerId = :uid', { uid: user.id });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.category) qb.andWhere('r.category = :category', { category: query.category });
    if (query.q) {
      qb.andWhere('(r.title ILIKE :q OR r.description ILIKE :q)', {
        q: `%${escapeLike(query.q.trim())}%`,
      });
    }
    this.applySort(qb, query.sort ?? RfqSort.CREATED_DESC);

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ids = rows.map((row) => row.id);
    const [lineItemCounts, quoteCounts, statusRows] = await Promise.all([
      this.countBy(this.lineItems, 'rfqId', ids),
      this.countBy(this.quotes, 'rfqId', ids),
      this.rfqs
        .createQueryBuilder('r')
        .select('r.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('r.buyerId = :uid', { uid: user.id })
        .groupBy('r.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      PUBLISHED: 0,
      CLOSED: 0,
      AWARDED: 0,
    };
    statusRows.forEach((row) => (statusCounts[row.status] = Number(row.count)));

    const items = rows.map((row) => ({
      ...this.toListItem(row),
      lineItemCount: lineItemCounts.get(row.id) ?? 0,
      quoteCount: quoteCounts.get(row.id) ?? 0,
    }));
    return { ...toPage(items, total, page, limit), statusCounts };
  }

  private async listForVendor(user: AuthUser, query: ListRfqsQueryDto): Promise<RfqListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.rfqs
      .createQueryBuilder('r')
      .leftJoin('r.buyer', 'b')
      .addSelect(['b.id', 'b.companyName'])
      .where('r.status = :published AND r.deadline > now()', { published: RfqStatus.PUBLISHED });

    if (query.category) qb.andWhere('r.category = :category', { category: query.category });
    if (query.q) {
      qb.andWhere('(r.title ILIKE :q OR r.description ILIKE :q OR r.category ILIKE :q)', {
        q: `%${escapeLike(query.q.trim())}%`,
      });
    }
    if (query.location) {
      qb.andWhere(
        `(r.deliveryCity ILIKE :loc OR r.deliveryState ILIKE :loc
          OR r.deliveryCountry ILIKE :loc OR r.deliveryPincode ILIKE :loc)`,
        { loc: `%${escapeLike(query.location.trim())}%` },
      );
    }
    if (query.deadlineFrom)
      qb.andWhere('r.deadline >= :from', { from: new Date(query.deadlineFrom) });
    if (query.deadlineTo) qb.andWhere('r.deadline <= :to', { to: new Date(query.deadlineTo) });
    this.applySort(qb, query.sort ?? RfqSort.DEADLINE_ASC);

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ids = rows.map((row) => row.id);
    const [lineItemCounts, mine] = await Promise.all([
      this.countBy(this.lineItems, 'rfqId', ids),
      ids.length
        ? this.quotes.find({ where: { vendorId: user.id, rfqId: In(ids) } })
        : Promise.resolve([] as Quote[]),
    ]);
    const myQuotes = new Map(mine.map((quote) => [quote.rfqId, quote]));

    const items = rows.map((row) => {
      const quote = myQuotes.get(row.id);
      return {
        ...this.toListItem(row),
        lineItemCount: lineItemCounts.get(row.id) ?? 0,
        buyerCompany: row.buyer.companyName,
        myQuote: quote ? this.toQuoteSummary(quote) : null,
      };
    });
    return toPage(items, total, page, limit);
  }

  private applySort(qb: ReturnType<Repository<Rfq>['createQueryBuilder']>, sort: RfqSort): void {
    if (sort === RfqSort.DEADLINE_ASC) qb.orderBy('r.deadline', 'ASC');
    else if (sort === RfqSort.DEADLINE_DESC) qb.orderBy('r.deadline', 'DESC');
    else qb.orderBy('r.createdAt', 'DESC');
    qb.addOrderBy('r.id', 'ASC');
  }

  private async countBy<T extends object>(
    repo: Repository<T>,
    column: 'rfqId',
    ids: string[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await repo
      .createQueryBuilder('x')
      .select(`x.${column}`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where(`x.${column} IN (:...ids)`, { ids })
      .groupBy(`x.${column}`)
      .getRawMany<{ key: string; count: string }>();
    return new Map(rows.map((row) => [row.key, Number(row.count)]));
  }

  /** Locks the buyer's RFQ row for the rest of the transaction, or 404. */
  /**
   * Only a draft and an open RFQ (published, deadline not yet passed) can be edited. Once the
   * deadline has passed it is closed for good, so the request every vendor priced stays as it was.
   */
  private async assertEditable(manager: EntityManager, rfq: Rfq): Promise<void> {
    if (rfq.status === RfqStatus.DRAFT) return;

    if (rfq.status === RfqStatus.PUBLISHED) {
      const now = await this.lifecycle.dbNow(manager);
      if (rfq.deadline.getTime() > now.getTime()) return;
    }

    throw AppException.conflict(
      'RFQ_NOT_EDITABLE',
      'Only a draft or an open RFQ can be edited. This one is closed or awarded.',
    );
  }

  /**
   * Line items can be replaced freely until a vendor quotes. A quote's prices point at these very
   * lines, so after that they must stay exactly as they are: sending the same items is accepted
   * (the form always sends them), changing them is refused. The RFQ row is locked here and quoting
   * needs that same row, so a quote cannot slip in between this check and the change.
   */
  private async replaceLineItems(
    manager: EntityManager,
    rfqId: string,
    items: LineItemDto[],
  ): Promise<void> {
    const quotes = await manager.count(Quote, { where: { rfqId } });
    if (quotes > 0) {
      const current = await manager.find(RfqLineItem, {
        where: { rfqId },
        order: { position: 'ASC' },
      });
      const unchanged =
        current.length === items.length &&
        current.every(
          (line, index) =>
            line.name === items[index].name &&
            Number(line.quantity) === Number(items[index].quantity) &&
            line.unit === items[index].unit,
        );
      if (!unchanged) {
        throw AppException.conflict(
          'RFQ_LINE_ITEMS_LOCKED',
          'Vendors have already quoted, so the line items can no longer be changed.',
        );
      }
      return;
    }

    await manager.delete(RfqLineItem, { rfqId });
    await this.insertLineItems(manager, rfqId, items);
  }

  private async lockOwned(manager: EntityManager, user: AuthUser, id: string): Promise<Rfq> {
    const rfq = await manager.findOne(Rfq, {
      where: { id, buyerId: user.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!rfq) throw AppException.notFound('RFQ not found');
    return rfq;
  }

  private async insertLineItems(
    manager: EntityManager,
    rfqId: string,
    items: LineItemDto[],
  ): Promise<void> {
    await manager.insert(
      RfqLineItem,
      items.map((item, index) => ({
        rfqId,
        position: index + 1,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      })),
    );
  }

  private parseFutureDeadline(value: string): Date {
    const deadline = new Date(value);
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      throw AppException.badRequest('DEADLINE_IN_PAST', 'The deadline must be in the future.');
    }
    return deadline;
  }

  private toLineItemView(item: RfqLineItem): LineItemView {
    return {
      id: item.id,
      position: item.position,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    };
  }

  private toQuoteSummary(quote: Quote): MyQuoteSummary {
    return {
      id: quote.id,
      status: quote.status,
      totalMinor: quote.totalMinor,
      deliveryDays: quote.deliveryDays,
      revisionNo: quote.currentRevisionNo,
      lastRevisedAt: quote.lastRevisedAt,
    };
  }

  private toListItem(row: Rfq): RfqListItem {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      deadline: row.deadline,
      deliveryCity: row.deliveryCity,
      deliveryState: row.deliveryState,
      deliveryCountry: row.deliveryCountry,
      budgetMinor: row.budgetMinor,
      currency: row.currency,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
      lineItemCount: 0,
    };
  }
}
