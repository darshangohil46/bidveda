"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { MyQuotesList } from "@/components/quote/MyQuotesList";

/** The vendor's own screen for the quotes they have sent. */
export function VendorQuotesPage() {
  return (
    <>
      <PageHeader
        title="My quotes"
        description="Every quote you have sent. You can revise one any time before its RFQ deadline."
      />
      <MyQuotesList />
    </>
  );
}
