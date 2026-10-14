import { ActorType, QuoteStatus, RfqStatus } from './enums';

export interface AttachmentView {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: Date;
}

export interface LineItemView {
  id: string;
  position: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface QuoteItemView {
  lineItemId: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

/** Compact quote info shown next to an RFQ for the vendor who owns it. */
export interface MyQuoteSummary {
  id: string;
  status: QuoteStatus;
  totalMinor: number;
  deliveryDays: number;
  revisionNo: number;
  lastRevisedAt: Date;
}

export interface RfqListItem {
  id: string;
  title: string;
  category: string;
  status: RfqStatus;
  deadline: Date;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
  budgetMinor: number | null;
  currency: string;
  createdAt: Date;
  publishedAt: Date | null;
  lineItemCount: number;
  /** Buyer view only. */
  quoteCount?: number;
  /** Vendor view only. */
  buyerCompany?: string;
  myQuote?: MyQuoteSummary | null;
}

export interface RfqDetailView {
  id: string;
  title: string;
  description: string;
  category: string;
  status: RfqStatus;
  deadline: Date;
  deliveryAddress: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
  deliveryPincode: string;
  budgetMinor: number | null;
  currency: string;
  publishedAt: Date | null;
  awardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  buyerCompany: string;
  lineItems: LineItemView[];
  attachments: AttachmentView[];
  /** Server clock, so the UI countdown never trusts the visitor's clock. */
  serverTime: Date;
  /** Buyer view only. */
  quoteCount?: number;
  awardedQuoteId?: string | null;
  /** Vendor view only. */
  myQuote?: MyQuoteSummary | null;
}

export interface StatusHistoryView {
  id: string;
  quoteId: string | null;
  fromStatus: string | null;
  toStatus: string;
  actorType: ActorType;
  actorName: string | null;
  note: string | null;
  createdAt: Date;
  /** Only filled for buyers, so a vendor never learns who the other bidders are. */
  vendorCompany?: string | null;
}

export interface QuoteRevisionView {
  revisionNo: number;
  totalMinor: number;
  deliveryDays: number;
  notes: string | null;
  createdAt: Date;
  items: QuoteItemView[];
}

export interface QuoteView {
  id: string;
  rfqId: string;
  status: QuoteStatus;
  revisionNo: number;
  totalMinor: number;
  deliveryDays: number;
  notes: string | null;
  submittedAt: Date;
  lastRevisedAt: Date;
  items: QuoteItemView[];
  attachments: AttachmentView[];
  vendor?: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    phone: string | null;
  };
  revisions?: QuoteRevisionView[];
}

export interface MyQuoteListItem {
  id: string;
  status: QuoteStatus;
  totalMinor: number;
  deliveryDays: number;
  revisionNo: number;
  submittedAt: Date;
  lastRevisedAt: Date;
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    deadline: Date;
    currency: string;
    buyerCompany: string;
  };
}

/** Unit price and computed line total for one RFQ line, before it is stored. */
export interface PricedLine {
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface AwardResult {
  rfqId: string;
  status: RfqStatus;
  awardedQuoteId: string;
  awardedAt: Date;
}

export interface RfqListResult {
  items: RfqListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Buyer view only: how many of the buyer's RFQs are in each status. */
  statusCounts?: Record<string, number>;
}

export interface ComparisonView {
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    deadline: Date;
    currency: string;
    budgetMinor: number | null;
    awardedQuoteId: string | null;
    lineItems: LineItemView[];
  };
  quotes: QuoteView[];
  sort: string;
}
