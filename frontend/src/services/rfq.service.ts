import { clientApi } from "@/lib/clientApi";
import type {
  RfqDetail,
  RfqListQuery,
  RfqListResult,
  RfqPayload,
  StatusHistoryEntry,
} from "@/types/rfq";

export class RfqService {
  list(query: RfqListQuery = {}, signal?: AbortSignal): Promise<RfqListResult> {
    return clientApi.get<RfqListResult>("/rfqs", { query, signal });
  }

  /** Also records how far the visitor's clock is from the server's, for honest countdowns. */
  async get(id: string, signal?: AbortSignal): Promise<RfqDetail> {
    const detail = await clientApi.get<RfqDetail>(`/rfqs/${id}`, { signal });
    return {
      ...detail,
      clockSkewMs: new Date(detail.serverTime).getTime() - Date.now(),
    };
  }

  create(payload: RfqPayload): Promise<RfqDetail> {
    return clientApi.post<RfqDetail>("/rfqs", payload);
  }

  update(id: string, payload: Partial<RfqPayload>): Promise<RfqDetail> {
    return clientApi.patch<RfqDetail>(`/rfqs/${id}`, payload);
  }

  remove(id: string): Promise<void> {
    return clientApi.delete<void>(`/rfqs/${id}`);
  }

  publish(id: string): Promise<RfqDetail> {
    return clientApi.post<RfqDetail>(`/rfqs/${id}/publish`);
  }

  history(id: string, signal?: AbortSignal): Promise<StatusHistoryEntry[]> {
    return clientApi.get<StatusHistoryEntry[]>(`/rfqs/${id}/history`, {
      signal,
    });
  }
}

export const rfqService = new RfqService();
