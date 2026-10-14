"use client";

import { useState } from "react";
import Link from "next/link";
import { Countdown } from "@/components/common/Countdown";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AwardDialog } from "@/components/quote/AwardDialog";
import { ComparisonSortBar } from "@/components/quote/ComparisonSortBar";
import { ComparisonSwiper } from "@/components/quote/ComparisonSwiper";
import { ComparisonTable } from "@/components/quote/ComparisonTable";
import { QuoteActions } from "@/components/quote/QuoteActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { quoteService } from "@/services/quote.service";
import { ComparisonSort, RfqStatus, UserRole } from "@/types/enums";
import type { Comparison, Quote } from "@/types/rfq";
import { rfqRoute } from "@/utils/constant";
import { formatDateTime, formatMoney, getErrorMessage } from "@/utils/general";

/** Shown while vendors can still change their quotes: the buyer may look, but not decide yet. */
function DeadlineNotice({ deadline }: { deadline: string }) {
  return (
    <div className="mb-5 rounded-sm border border-amber/30 bg-amber-soft px-4 py-3 text-[0.8125rem] text-ink">
      Vendors can still revise their quotes until {formatDateTime(deadline)} (
      <Countdown deadline={deadline} />
      ). You can compare now; shortlisting and awarding open once the deadline
      has passed.
    </div>
  );
}

/** Shown once a quote has been accepted. */
function WinnerNotice({
  winner,
  currency,
}: {
  winner: Quote;
  currency: string;
}) {
  return (
    <div className="mb-5 rounded-sm border border-pine/40 bg-pine-soft px-4 py-3 text-[0.8125rem] text-ink">
      Awarded to <strong>{winner.vendor?.companyName}</strong> at{" "}
      <strong className="t-figure">
        {formatMoney(winner.totalMinor, currency)}
      </strong>
      . The other quotes were rejected.
    </div>
  );
}

function ComparisonSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/**
 * The buyer's decision screen: every quote side by side.
 *
 * How it works:
 *  1. The quotes come from the API already sorted; changing the sort loads them again.
 *  2. Wide screens show a table, phones show swipeable cards (both get the same data).
 *  3. Once the RFQ is closed each quote has "Shortlist" and "Award" buttons. Awarding asks to confirm first.
 */
export function ComparisonPage({ rfqId }: { rfqId: string }) {
  const { success, error } = useToast();
  const [sort, setSort] = useState<ComparisonSort>(ComparisonSort.TOTAL_ASC);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [awarding, setAwarding] = useState<Quote | null>(null);

  const {
    data,
    error: loadError,
    loading,
    reload,
  } = useApiQuery(
    (signal) => quoteService.comparison(rfqId, sort, signal),
    `${rfqId}:${sort}`,
  );

  if (loadError) return <ErrorNotice error={loadError} onRetry={reload} />;
  if (!data) return <ComparisonSkeleton />;

  const { rfq, quotes } = data;
  const winner = quotes.find((quote) => quote.id === rfq.awardedQuoteId);

  async function shortlist(quote: Quote) {
    setBusyId(quote.id);
    try {
      await quoteService.shortlist(rfqId, quote.id);
      success("Quote shortlisted", quote.vendor?.companyName);
      reload();
    } catch (caught) {
      error("Could not shortlist", getErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function award(quote: Quote, note: string) {
    try {
      await quoteService.award(rfqId, quote.id, note);
      success("RFQ awarded", `${quote.vendor?.companyName} has been accepted.`);
      reload();
    } catch (caught) {
      error("Could not award the RFQ", getErrorMessage(caught));
      throw caught;
    }
  }

  const renderActions = (quote: Quote) => (
    <QuoteActions
      rfqStatus={rfq.status}
      quote={quote}
      busyId={busyId}
      onShortlist={shortlist}
      onAward={setAwarding}
    />
  );

  return (
    <>
      <PageHeader
        title="Compare quotes"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-ink">{rfq.title}</span>
            <StatusBadge kind="rfq" status={rfq.status} />
          </span>
        }
        back={{ href: rfqRoute(UserRole.BUYER, rfqId), label: "Back to RFQ" }}
        actions={
          <Button asChild variant="outline">
            <Link href={rfqRoute(UserRole.BUYER, rfqId)}>RFQ details</Link>
          </Button>
        }
      />

      {rfq.status === RfqStatus.PUBLISHED && (
        <DeadlineNotice deadline={rfq.deadline} />
      )}
      {winner && <WinnerNotice winner={winner} currency={rfq.currency} />}

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          description="Vendors have not quoted on this RFQ. They will appear here as they arrive."
        />
      ) : (
        <>
          <ComparisonSortBar sort={sort} onChange={setSort} loading={loading} />
          <QuotesView
            comparison={data}
            renderActions={renderActions}
            loading={loading}
          />
        </>
      )}

      <AwardDialog
        quote={awarding}
        currency={rfq.currency}
        otherQuotes={Math.max(0, quotes.length - 1)}
        onClose={() => setAwarding(null)}
        onConfirm={award}
      />
    </>
  );
}

/** The quotes as a table on wide screens and as swipeable cards on phones. */
function QuotesView({
  comparison,
  renderActions,
  loading,
}: {
  comparison: Comparison;
  renderActions: (quote: Quote) => React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className={cn("transition-opacity", loading && "opacity-60")}>
      <div className="hidden md:block">
        <ComparisonTable
          comparison={comparison}
          renderActions={renderActions}
        />
      </div>
      <div className="md:hidden">
        <ComparisonSwiper
          comparison={comparison}
          renderActions={renderActions}
        />
      </div>
    </div>
  );
}
