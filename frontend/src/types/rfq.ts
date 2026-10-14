import type {
  ActorType,
  ComparisonSort,
  QuoteStatus,
  RfqSort,
  RfqStatus,
} from "@/types/enums";

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}

export interface LineItem {
  id: string;
  position: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface QuoteItem {
  lineItemId: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface MyQuoteSummary {
  id: string;
  status: QuoteStatus;
  totalMinor: number;
  deliveryDays: number;
  revisionNo: number;
  lastRevisedAt: string;
}

export interface RfqListItem {
  id: string;
  title: string;
  category: string;
  status: RfqStatus;
  deadline: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
  budgetMinor: number | null;
  currency: string;
  createdAt: string;
  publishedAt: string | null;
  lineItemCount: number;
  quoteCount?: number;
  buyerCompany?: string;
  myQuote?: MyQuoteSummary | null;
}

export interface RfqListResult {
  items: RfqListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts?: Record<RfqStatus, number>;
}

export interface RfqDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  status: RfqStatus;
  deadline: string;
  deliveryAddress: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
  deliveryPincode: string;
  budgetMinor: number | null;
  currency: string;
  publishedAt: string | null;
  awardedAt: string | null;
  createdAt: string;
  updatedAt: string;
  buyerCompany: string;
  lineItems: LineItem[];
  attachments: Attachment[];
  serverTime: string;
  quoteCount?: number;
  awardedQuoteId?: string | null;
  myQuote?: MyQuoteSummary | null;
  /** Client-side only: server clock minus this device's clock, in milliseconds. */
  clockSkewMs?: number;
}

export interface LineItemInput {
  name: string;
  quantity: number;
  unit: string;
}

/** A line item as typed into the form: everything is a string until it is validated. */
export interface LineItemDraft {
  key: string;
  name: string;
  quantity: string;
  unit: string;
}

export type LineItemErrors = Record<
  string,
  Partial<Record<"name" | "quantity" | "unit", string>>
>;

export interface RfqPayload {
  title: string;
  description: string;
  category: string;
  deliveryAddress?: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;
  deliveryPincode: string;
  budgetMinor?: number | null;
  deadline: string;
  lineItems: LineItemInput[];
}

export type RfqListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  status?: RfqStatus | "";
  category?: string;
  location?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  sort?: RfqSort;
};

export interface StatusHistoryEntry {
  id: string;
  quoteId: string | null;
  fromStatus: string | null;
  toStatus: string;
  actorType: ActorType;
  actorName: string | null;
  note: string | null;
  createdAt: string;
  vendorCompany?: string | null;
}

export interface QuoteRevision {
  revisionNo: number;
  totalMinor: number;
  deliveryDays: number;
  notes: string | null;
  createdAt: string;
  items: QuoteItem[];
}

export interface Quote {
  id: string;
  rfqId: string;
  status: QuoteStatus;
  revisionNo: number;
  totalMinor: number;
  deliveryDays: number;
  notes: string | null;
  submittedAt: string;
  lastRevisedAt: string;
  items: QuoteItem[];
  attachments: Attachment[];
  vendor?: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    phone: string | null;
  };
  revisions?: QuoteRevision[];
}

export interface QuotePayload {
  items: Array<{ lineItemId: string; unitPriceMinor: number }>;
  deliveryDays: number;
  notes?: string;
}

export interface MyQuoteListItem {
  id: string;
  status: QuoteStatus;
  totalMinor: number;
  deliveryDays: number;
  revisionNo: number;
  submittedAt: string;
  lastRevisedAt: string;
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    deadline: string;
    currency: string;
    buyerCompany: string;
  };
}

export interface Comparison {
  rfq: {
    id: string;
    title: string;
    status: RfqStatus;
    deadline: string;
    currency: string;
    budgetMinor: number | null;
    awardedQuoteId: string | null;
    lineItems: LineItem[];
  };
  quotes: Quote[];
  sort: ComparisonSort;
}

export interface AwardResult {
  rfqId: string;
  status: RfqStatus;
  awardedQuoteId: string;
  awardedAt: string;
}
