import { AttachmentList } from "@/components/common/AttachmentList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { QuoteRevisions } from "@/components/quote/QuoteRevisions";
import type { LineItem, Quote } from "@/types/rfq";
import {
  formatDateTime,
  formatDays,
  formatMoney,
  formatQuantity,
} from "@/utils/general";

interface QuoteDetailsProps {
  quote: Quote;
  lineItems: LineItem[];
  currency: string;
}

/** A submitted quote, read-only: what was offered per line, the total, the terms and every revision. */
export function QuoteDetails({
  quote,
  lineItems,
  currency,
}: QuoteDetailsProps) {
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-sm border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-sunken px-4 py-2.5">
          <StatusBadge kind="quote" status={quote.status} />
          <span className="text-[0.75rem] text-ink-3">
            Revision <span className="t-figure">{quote.revisionNo}</span> · last
            changed {formatDateTime(quote.lastRevisedAt)}
          </span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="t-caption border-b">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 text-right font-medium">Unit price</th>
              <th className="px-4 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lineItems.map((line) => {
              const item = quote.items.find(
                (entry) => entry.lineItemId === line.id,
              );
              return (
                <tr key={line.id}>
                  <td className="px-4 py-2.5">
                    <span className="block text-[0.875rem] text-ink">
                      {line.name}
                    </span>
                    <span className="t-figure text-[0.75rem] text-ink-3">
                      {formatQuantity(line.quantity)} {line.unit}
                    </span>
                  </td>
                  <td className="t-figure px-4 py-2.5 text-right text-[0.875rem]">
                    {item ? formatMoney(item.unitPriceMinor, currency) : "-"}
                  </td>
                  <td className="t-figure px-4 py-2.5 text-right text-[0.875rem]">
                    {item ? formatMoney(item.lineTotalMinor, currency) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-sunken/70">
              <th
                scope="row"
                colSpan={2}
                className="px-4 py-3 text-left text-[0.9375rem] font-semibold text-ink"
              >
                Total · delivery in{" "}
                <span className="t-figure">
                  {formatDays(quote.deliveryDays)}
                </span>
              </th>
              <td className="t-figure px-4 py-3 text-right text-[1.25rem] text-ink">
                {formatMoney(quote.totalMinor, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {quote.notes && (
        <p className="whitespace-pre-line text-[0.875rem] text-ink-2">
          {quote.notes}
        </p>
      )}
      {quote.attachments.length > 0 && (
        <AttachmentList attachments={quote.attachments} />
      )}
      {quote.revisions && (
        <QuoteRevisions revisions={quote.revisions} currency={currency} />
      )}
    </div>
  );
}
