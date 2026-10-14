"use client";

import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { AttachmentList } from "@/components/common/AttachmentList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BudgetDelta } from "@/components/quote/BudgetDelta";
import { QuoteHighlights } from "@/components/quote/QuoteHighlights";
import { QuoteRevisions } from "@/components/quote/QuoteRevisions";
import { cn } from "@/lib/utils";
import type { Comparison, Quote } from "@/types/rfq";
import { findHighlights, itemFor } from "@/utils/comparison";
import { formatDays, formatMoney, formatQuantity } from "@/utils/general";

interface ComparisonSwiperProps {
  comparison: Comparison;
  renderActions: (quote: Quote) => React.ReactNode;
}

/** On phones a wide table is unusable, so each vendor becomes a card you swipe between. */
export function ComparisonSwiper({
  comparison,
  renderActions,
}: ComparisonSwiperProps) {
  const { rfq, quotes } = comparison;
  const highlights = findHighlights(quotes);

  return (
    <Swiper
      modules={[Pagination]}
      pagination={{ clickable: true }}
      spaceBetween={12}
      slidesPerView={1.06}
      observer
      observeParents
      className="pb-9!"
    >
      {quotes.map((quote) => {
        return (
          <SwiperSlide key={quote.id} className="h-auto!">
            <article
              className={cn(
                "grid h-full content-start gap-4 rounded-sm border bg-card p-4",
                quote.id === rfq.awardedQuoteId &&
                  "border-pine bg-pine-soft/40",
              )}
            >
              <header className="grid gap-1.5">
                <h3 className="text-[1rem] font-semibold text-ink">
                  {quote.vendor?.companyName}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge kind="quote" status={quote.status} />
                  <QuoteHighlights quoteId={quote.id} highlights={highlights} />
                </div>
              </header>

              <div>
                <p className="t-caption">Total</p>
                <p className="t-figure text-[1.625rem] leading-tight text-ink">
                  {formatMoney(quote.totalMinor, rfq.currency)}
                </p>
                <BudgetDelta
                  totalMinor={quote.totalMinor}
                  budgetMinor={rfq.budgetMinor}
                  className="block text-[0.75rem] text-ink-3"
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 border-y py-3">
                <div>
                  <dt className="t-caption">Delivery</dt>
                  <dd className="t-figure text-[0.9375rem] text-ink">
                    {formatDays(quote.deliveryDays)}
                  </dd>
                </div>
                <div>
                  <dt className="t-caption">Revision</dt>
                  <dd className="t-figure text-[0.9375rem] text-ink">
                    v{quote.revisionNo}
                  </dd>
                </div>
              </dl>

              <ul className="grid gap-2">
                {rfq.lineItems.map((line) => {
                  const item = itemFor(quote, line.id);
                  return (
                    <li
                      key={line.id}
                      className="flex items-start justify-between gap-3 text-[0.8125rem]"
                    >
                      <span className="min-w-0">
                        <span className="block text-ink">{line.name}</span>
                        <span className="t-figure text-[0.75rem] text-ink-3">
                          {formatQuantity(line.quantity)} {line.unit} at{" "}
                          {item
                            ? formatMoney(item.unitPriceMinor, rfq.currency)
                            : "-"}
                        </span>
                      </span>
                      <span className="t-figure shrink-0 text-ink">
                        {item
                          ? formatMoney(item.lineTotalMinor, rfq.currency)
                          : "-"}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {quote.notes && (
                <p className="whitespace-pre-line text-[0.8125rem] text-ink-2">
                  {quote.notes}
                </p>
              )}
              {quote.revisions && (
                <QuoteRevisions
                  revisions={quote.revisions}
                  currency={rfq.currency}
                />
              )}
              {quote.attachments.length > 0 && (
                <AttachmentList attachments={quote.attachments} />
              )}

              <div className="border-t pt-3">{renderActions(quote)}</div>
            </article>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
