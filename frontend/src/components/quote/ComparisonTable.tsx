"use client";

import { AttachmentList } from "@/components/common/AttachmentList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BudgetDelta } from "@/components/quote/BudgetDelta";
import { QuoteHighlights } from "@/components/quote/QuoteHighlights";
import { QuoteRevisions } from "@/components/quote/QuoteRevisions";
import { cn } from "@/lib/utils";
import type { Comparison, Quote } from "@/types/rfq";
import { findHighlights, itemFor } from "@/utils/comparison";
import { formatDays, formatMoney, formatQuantity } from "@/utils/general";

interface ComparisonTableProps {
  comparison: Comparison;
  renderActions: (quote: Quote) => React.ReactNode;
}

const STICKY = "sticky left-0 z-10 border-r";
const LABEL = "t-caption px-4 py-3 text-left align-top";

/**
 * Vendors are columns, line items are rows. The first column stays put while the table scrolls
 * sideways, so item names are never lost. Totals are the loudest numbers on the page.
 */
export function ComparisonTable({
  comparison,
  renderActions,
}: ComparisonTableProps) {
  const { rfq, quotes } = comparison;
  const highlights = findHighlights(quotes);
  const winnerId = rfq.awardedQuoteId;

  const cell = (quote: Quote) =>
    cn(
      "min-w-[13.5rem] px-4 py-3 align-top",
      quote.id === winnerId && "bg-pine-soft/50",
    );

  /** One row: the label in the sticky first column, then one cell per quote. */
  const row = (
    label: string,
    render: (quote: Quote) => React.ReactNode,
    style: { cell?: string; row?: string } = {},
  ) => (
    <tr key={label} className={style.row}>
      <th scope="row" className={cn(STICKY, "bg-card", LABEL, "font-medium")}>
        {label}
      </th>
      {quotes.map((quote) => (
        <td key={quote.id} className={cn(cell(quote), style.cell)}>
          {render(quote)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto rounded-sm border bg-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b bg-sunken">
            <th scope="col" className={cn(STICKY, "min-w-44 bg-sunken", LABEL)}>
              {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
            </th>
            {quotes.map((quote) => (
              <th
                key={quote.id}
                scope="col"
                className={cn(cell(quote), "bg-transparent font-normal")}
              >
                <div className="grid gap-1.5">
                  <span className="text-[0.9375rem] font-semibold text-ink">
                    {quote.vendor?.companyName}
                  </span>
                  <StatusBadge kind="quote" status={quote.status} />
                  <QuoteHighlights quoteId={quote.id} highlights={highlights} />
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y">
          {rfq.lineItems.map((line) => (
            <tr key={line.id}>
              <th
                scope="row"
                className={cn(
                  STICKY,
                  "bg-card px-4 py-3 text-left align-top font-normal",
                )}
              >
                <span className="block text-[0.875rem] text-ink">
                  {line.name}
                </span>
                <span className="t-figure text-[0.75rem] text-ink-3">
                  {formatQuantity(line.quantity)} {line.unit}
                </span>
              </th>
              {quotes.map((quote) => {
                const item = itemFor(quote, line.id);
                return (
                  <td key={quote.id} className={cell(quote)}>
                    {item ? (
                      <>
                        <span className="t-figure block text-[0.875rem] text-ink">
                          {formatMoney(item.unitPriceMinor, rfq.currency)}
                        </span>
                        <span className="t-figure text-[0.75rem] text-ink-3">
                          line total{" "}
                          {formatMoney(item.lineTotalMinor, rfq.currency)}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-3">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="bg-sunken/70">
            <th
              scope="row"
              className={cn(
                STICKY,
                "bg-sunken px-4 py-4 text-left align-top text-[0.9375rem] font-semibold text-ink",
              )}
            >
              Total
            </th>
            {quotes.map((quote) => (
              <td key={quote.id} className={cn(cell(quote), "py-4")}>
                <span className="t-figure block text-[1.375rem] leading-none text-ink">
                  {formatMoney(quote.totalMinor, rfq.currency)}
                </span>
                <BudgetDelta
                  totalMinor={quote.totalMinor}
                  budgetMinor={rfq.budgetMinor}
                  className="mt-1 block text-[0.75rem] text-ink-3"
                />
              </td>
            ))}
          </tr>

          {row("Delivery", (quote) => formatDays(quote.deliveryDays), {
            cell: "t-figure text-[0.9375rem] text-ink",
          })}

          {row(
            "Revision",
            (quote) => (
              <>
                <span className="t-figure">v{quote.revisionNo}</span>
                {quote.revisionNo > 1 && " (revised)"}
                {quote.revisions && quote.revisions.length > 1 && (
                  <div className="mt-2 font-normal">
                    <QuoteRevisions
                      revisions={quote.revisions}
                      currency={rfq.currency}
                    />
                  </div>
                )}
              </>
            ),
            { cell: "text-[0.8125rem] text-ink-2" },
          )}

          {row(
            "Notes",
            (quote) => quote.notes ?? <span className="text-ink-3">None</span>,
            {
              cell: "max-w-[16rem] whitespace-pre-line text-[0.8125rem] text-ink-2",
            },
          )}

          {row("Documents", (quote) => (
            <AttachmentList
              attachments={quote.attachments}
              emptyText="No documents"
            />
          ))}

          {row("Decision", renderActions, { row: "border-t-2" })}
        </tbody>
      </table>
    </div>
  );
}
