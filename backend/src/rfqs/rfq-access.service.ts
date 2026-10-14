import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../common/errors/app.exception';
import { RfqLifecycleService } from '../history/rfq-lifecycle.service';
import { Quote, Rfq } from '../schema';
import { AuthUser } from '../types/auth.types';
import { RfqStatus, UserRole } from '../types/enums';

/**
 * One place that answers "may this user see this RFQ?".
 *  - A buyer sees only their own RFQs.
 *  - A vendor sees PUBLISHED RFQs, plus any RFQ they have already quoted on.
 *  - A vendor never sees a DRAFT.
 * Everything else is reported as 404, never 403, so ids cannot be probed.
 */
@Injectable()
export class RfqAccessService {
  constructor(
    @InjectRepository(Rfq) private readonly rfqs: Repository<Rfq>,
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    private readonly lifecycle: RfqLifecycleService,
  ) {}

  async loadVisible(user: AuthUser, id: string): Promise<Rfq> {
    await this.lifecycle.closeExpired(undefined, id);

    const rfq = await this.rfqs.findOne({
      where: { id },
      relations: { buyer: true, lineItems: true },
      order: { lineItems: { position: 'ASC' } },
    });
    if (!rfq) throw AppException.notFound('RFQ not found');

    if (user.role === UserRole.BUYER) {
      if (rfq.buyerId !== user.id) throw AppException.notFound('RFQ not found');
      return rfq;
    }

    if (rfq.status === RfqStatus.DRAFT) throw AppException.notFound('RFQ not found');
    if (rfq.status !== RfqStatus.PUBLISHED) {
      const hasQuoted = await this.quotes.exists({ where: { rfqId: id, vendorId: user.id } });
      if (!hasQuoted) throw AppException.notFound('RFQ not found');
    }
    return rfq;
  }

  /** The buyer's own RFQ, or 404. */
  async loadOwned(user: AuthUser, id: string): Promise<Rfq> {
    const rfq = await this.rfqs.findOne({ where: { id, buyerId: user.id } });
    if (!rfq) throw AppException.notFound('RFQ not found');
    return rfq;
  }
}
