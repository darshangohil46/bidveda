"use client";

import { ErrorNotice } from "@/components/common/ErrorNotice";
import { QuoteDetails } from "@/components/quote/QuoteDetails";
import { MyQuoteSummary } from "@/components/rfq/MyQuoteSummary";
import {
  RfqDetailLayout,
  RfqDetailSkeleton,
} from "@/components/rfq/RfqDetailLayout";
import { Fact } from "@/components/rfq/RfqFacts";
import { VendorRfqActions } from "@/components/rfq/VendorRfqActions";
import { useApiQuery } from "@/hooks/use-api-query";
import { quoteService } from "@/services/quote.service";
import { rfqService } from "@/services/rfq.service";
import { UserRole } from "@/types/enums";

/**
 * One RFQ as a vendor sees it.
 * The vendor gets the buyer's company, a button to send or revise a quote, and, once they have
 * quoted, their own quote (readable even after the deadline).
 */
export function VendorRfqDetailPage({ id }: { id: string }) {
  const {
    data: rfq,
    error,
    reload,
  } = useApiQuery((signal) => rfqService.get(id, signal), id);
  // The full quote is only fetched once the vendor has one. The key changes with each revision so it reloads.
  const mine = useApiQuery(
    (signal) => quoteService.mine(id, signal),
    `${id}:mine:${rfq?.myQuote?.revisionNo ?? 0}`,
    {
      enabled: !!rfq?.myQuote,
    },
  );

  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!rfq) return <RfqDetailSkeleton />;

  return (
    <RfqDetailLayout
      rfq={rfq}
      role={UserRole.VENDOR}
      subtitle={rfq.buyerCompany}
      actions={<VendorRfqActions rfq={rfq} />}
      facts={<Fact label="Buyer">{rfq.buyerCompany}</Fact>}
      aside={
        rfq.myQuote && (
          <MyQuoteSummary quote={rfq.myQuote} currency={rfq.currency} />
        )
      }
      extra={
        mine.data?.quote && (
          <section aria-labelledby="rfq-my-quote">
            <h2 id="rfq-my-quote" className="t-h2 mb-3">
              Your quote
            </h2>
            <QuoteDetails
              quote={mine.data.quote}
              lineItems={rfq.lineItems}
              currency={rfq.currency}
            />
          </section>
        )
      }
    />
  );
}
