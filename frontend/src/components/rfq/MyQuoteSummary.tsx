import { StatusBadge } from "@/components/common/StatusBadge";
import type { MyQuoteSummary as MyQuoteSummaryData } from "@/types/rfq";
import { formatDateTime, formatDays, formatMoney } from "@/utils/general";

/** A vendor's own bid on an RFQ, shown beside the RFQ they bid on. */
export function MyQuoteSummary({
  quote,
  currency,
}: {
  quote: MyQuoteSummaryData;
  currency: string;
}) {
  return (
    <div className="rounded-sm border border-pine/40 bg-pine-soft/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-caption text-pine-dark">Your quote</p>
        <StatusBadge kind="quote" status={quote.status} />
      </div>
      <p className="t-figure mt-1.5 text-[1.375rem] leading-none text-ink">
        {formatMoney(quote.totalMinor, currency)}
      </p>
      <p className="mt-1.5 text-[0.8125rem] text-ink-2">
        <span className="t-figure">{formatDays(quote.deliveryDays)}</span>{" "}
        delivery · revision <span className="t-figure">{quote.revisionNo}</span>
      </p>
      <p className="mt-0.5 text-[0.75rem] text-ink-3">
        Last changed {formatDateTime(quote.lastRevisedAt)}
      </p>
    </div>
  );
}
