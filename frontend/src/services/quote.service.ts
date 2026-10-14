import { clientApi } from "@/lib/clientApi";
import { ComparisonSort, QuoteStatus } from "@/types/enums";
import type { PageQuery, Paginated } from "@/types/api";
import type {
  AwardResult,
  Comparison,
  MyQuoteListItem,
  Quote,
  QuotePayload,
} from "@/types/rfq";

export class QuoteService {
  /** Submit, or revise: the server adds a new revision whenever something changed. */
  submit(rfqId: string, payload: QuotePayload): Promise<Quote> {
    return clientApi.put<Quote>(`/rfqs/${rfqId}/my-quote`, payload);
  }

  mine(rfqId: string, signal?: AbortSignal): Promise<{ quote: Quote | null }> {
    return clientApi.get<{ quote: Quote | null }>(`/rfqs/${rfqId}/my-quote`, {
      signal,
    });
  }

  listMine(
    query: PageQuery & { status?: QuoteStatus | "" } = {},
    signal?: AbortSignal,
  ): Promise<Paginated<MyQuoteListItem>> {
    return clientApi.get<Paginated<MyQuoteListItem>>("/quotes/mine", {
      query,
      signal,
    });
  }

  get(id: string, signal?: AbortSignal): Promise<Quote> {
    return clientApi.get<Quote>(`/quotes/${id}`, { signal });
  }

  comparison(
    rfqId: string,
    sort: ComparisonSort,
    signal?: AbortSignal,
  ): Promise<Comparison> {
    return clientApi.get<Comparison>(`/rfqs/${rfqId}/comparison`, {
      query: { sort },
      signal,
    });
  }

  shortlist(rfqId: string, quoteId: string): Promise<Quote> {
    return clientApi.post<Quote>(`/rfqs/${rfqId}/quotes/${quoteId}/shortlist`);
  }

  award(rfqId: string, quoteId: string, note?: string): Promise<AwardResult> {
    return clientApi.post<AwardResult>(`/rfqs/${rfqId}/award`, {
      quoteId,
      note: note || undefined,
    });
  }
}

export const quoteService = new QuoteService();
