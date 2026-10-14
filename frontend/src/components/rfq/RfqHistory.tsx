"use client";

import { ErrorNotice } from "@/components/common/ErrorNotice";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { rfqService } from "@/services/rfq.service";
import { QuoteStatus, RfqStatus, UserRole } from "@/types/enums";
import type { StatusHistoryEntry } from "@/types/rfq";
import { QUOTE_STATUS_META, RFQ_STATUS_META } from "@/utils/constant";
import { formatDateTime } from "@/utils/general";

function statusLabel(entry: StatusHistoryEntry, status: string | null): string {
  if (!status) return "";
  const meta = entry.quoteId
    ? QUOTE_STATUS_META[status as QuoteStatus]
    : RFQ_STATUS_META[status as RfqStatus];
  return meta?.label ?? status;
}

function describe(entry: StatusHistoryEntry, role: UserRole): string {
  const to = statusLabel(entry, entry.toStatus);
  const from = statusLabel(entry, entry.fromStatus);
  const subject = entry.quoteId
    ? role === UserRole.BUYER
      ? `Quote from ${entry.vendorCompany ?? "a vendor"}`
      : "Your quote"
    : "RFQ";
  return from ? `${subject}: ${from} to ${to}` : `${subject}: ${to}`;
}

/** The append-only trail of every status change, oldest first. */
export function RfqHistory({
  rfqId,
  role,
  refreshKey,
}: {
  rfqId: string;
  role: UserRole;
  refreshKey: string;
}) {
  const { data, error, reload } = useApiQuery(
    (signal) => rfqService.history(rfqId, signal),
    `${rfqId}:${refreshKey}`,
  );

  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-24 w-full" />;

  return (
    <ol className="relative grid gap-0 border-l border-line-strong pl-5">
      {data.map((entry) => (
        <li key={entry.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[1.5625rem] size-2 rounded-full bg-ink-3 ring-4 ring-background"
          />
          <p className="text-[0.875rem] text-ink">{describe(entry, role)}</p>
          <p className="text-[0.75rem] text-ink-3">
            <span className="t-figure">{formatDateTime(entry.createdAt)}</span>
            {entry.actorName && ` · ${entry.actorName}`}
          </p>
          {entry.note && (
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">{entry.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
