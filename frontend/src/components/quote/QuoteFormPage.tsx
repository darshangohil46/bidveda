"use client";

import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { QuoteDetails } from "@/components/quote/QuoteDetails";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { quoteService } from "@/services/quote.service";
import { rfqService } from "@/services/rfq.service";
import { RfqStatus, UserRole } from "@/types/enums";
import { rfqRoute } from "@/utils/constant";

/**
 * The page behind "Submit a quote" / "Revise your quote": loads the RFQ and the vendor's current
 * quote, then shows the form. After the deadline it shows the quote read-only instead.
 */
export function QuoteFormPage({ rfqId }: { rfqId: string }) {
  const rfqQuery = useApiQuery(
    (signal) => rfqService.get(rfqId, signal),
    rfqId,
  );
  const quoteQuery = useApiQuery(
    (signal) => quoteService.mine(rfqId, signal),
    rfqId,
  );

  const error = rfqQuery.error ?? quoteQuery.error;
  if (error)
    return (
      <ErrorNotice
        error={error}
        onRetry={() => {
          rfqQuery.reload();
          quoteQuery.reload();
        }}
      />
    );

  const rfq = rfqQuery.data;
  if (!rfq || !quoteQuery.data) {
    return (
      <div aria-busy="true" className="grid gap-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // Judged against the server's clock at fetch time, never the visitor's.
  const deadlinePassed =
    rfq.status !== RfqStatus.PUBLISHED ||
    new Date(rfq.deadline).getTime() <= new Date(rfq.serverTime).getTime();
  const existing = quoteQuery.data.quote;

  return (
    <>
      <PageHeader
        title={existing ? "Revise your quote" : "Submit a quote"}
        description={rfq.title}
        back={{ href: rfqRoute(UserRole.VENDOR, rfqId), label: "Back to RFQ" }}
      />
      {deadlinePassed ? (
        <div className="grid gap-6">
          <EmptyState
            title="The deadline has passed"
            description={
              existing
                ? "Quotes can no longer be changed on this RFQ. Your quote is shown below exactly as the buyer sees it."
                : "Quotes can no longer be submitted on this RFQ."
            }
            action={
              <Button asChild size="sm">
                <Link href={rfqRoute(UserRole.VENDOR, rfqId)}>
                  Back to the RFQ
                </Link>
              </Button>
            }
          />
          {existing && (
            <QuoteDetails
              quote={existing}
              lineItems={rfq.lineItems}
              currency={rfq.currency}
            />
          )}
        </div>
      ) : (
        <QuoteForm rfq={rfq} existing={existing} />
      )}
    </>
  );
}
