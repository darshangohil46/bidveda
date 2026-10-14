"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { LoadingRows } from "@/components/common/LoadingRows";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useApiQuery } from "@/hooks/use-api-query";
import { cn } from "@/lib/utils";
import { quoteService } from "@/services/quote.service";
import { QuoteStatus, UserRole } from "@/types/enums";
import {
  DEFAULT_PAGE_SIZE,
  QUOTE_STATUS_META,
  rfqRoute,
} from "@/utils/constant";
import { formatDateTime, formatDays, formatMoney } from "@/utils/general";

const GRID = "md:grid-cols-[minmax(0,1fr)_8rem_9rem_7rem_9.5rem]";
const FILTERS: Array<QuoteStatus | ""> = [
  "",
  QuoteStatus.SUBMITTED,
  QuoteStatus.SHORTLISTED,
  QuoteStatus.ACCEPTED,
  QuoteStatus.REJECTED,
];

/** Every quote this vendor sent and where it stands. Lives inside the vendor's RFQ list screen. */
export function MyQuotesList() {
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [page, setPage] = useState(1);

  const query = { page, limit: DEFAULT_PAGE_SIZE, status };
  const { data, error, loading, reload } = useApiQuery(
    (signal) => quoteService.listMine(query, signal),
    JSON.stringify(query),
  );

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter by status"
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1"
      >
        {FILTERS.map((value) => (
          <button
            key={value || "all"}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={cn(
              "shrink-0 rounded-sm px-3 py-1.5 text-[0.8125rem] transition-colors",
              status === value
                ? "bg-ink font-medium text-paper"
                : "text-ink-2 hover:bg-sunken",
            )}
          >
            {value ? QUOTE_STATUS_META[value].label : "All"}
          </button>
        ))}
      </div>

      {error && <ErrorNotice error={error} onRetry={reload} />}

      {!error &&
        (!data || data.items.length === 0) &&
        (loading ? (
          <LoadingRows />
        ) : (
          <EmptyState
            title={
              status
                ? "No quotes with this status"
                : "You have not submitted a quote yet"
            }
            description="Open an RFQ from the other tab, price each line, and send your quote. You can revise it until the deadline."
          />
        ))}

      {!error && data && data.items.length > 0 && (
        <>
          <div
            className={cn(
              "overflow-hidden rounded-sm border bg-card transition-opacity",
              loading && "opacity-60",
            )}
          >
            <div
              className={cn(
                "t-caption hidden gap-4 border-b bg-sunken px-4 py-2 md:grid",
                GRID,
              )}
            >
              <span>RFQ</span>
              <span>Status</span>
              <span className="text-right">Total</span>
              <span className="text-right">Delivery</span>
              <span className="text-right">Last changed</span>
            </div>
            <div className="divide-y">
              {data.items.map((quote) => (
                <Link
                  key={quote.id}
                  href={rfqRoute(UserRole.VENDOR, quote.rfq.id)}
                  className={cn(
                    "group grid gap-1.5 px-4 py-3.5 transition-colors hover:bg-sunken/70 md:items-center md:gap-4",
                    GRID,
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink group-hover:text-pine">
                      {quote.rfq.title}
                    </p>
                    <p className="truncate text-[0.8125rem] text-ink-3">
                      {quote.rfq.buyerCompany} · revision{" "}
                      <span className="t-figure">{quote.revisionNo}</span>
                    </p>
                  </div>
                  <StatusBadge kind="quote" status={quote.status} />
                  <p className="t-figure text-[0.875rem] text-ink md:text-right">
                    {formatMoney(quote.totalMinor, quote.rfq.currency)}
                  </p>
                  <p className="t-figure text-[0.8125rem] text-ink-2 md:text-right">
                    {formatDays(quote.deliveryDays)}
                  </p>
                  <p className="text-[0.75rem] text-ink-3 md:text-right">
                    {formatDateTime(quote.lastRevisedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
