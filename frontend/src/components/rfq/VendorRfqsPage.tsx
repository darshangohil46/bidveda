"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { VendorRfqBrowse } from "@/components/rfq/VendorRfqBrowse";

/** The vendor's RFQ list: requests that are accepting quotes right now. */
export function VendorRfqsPage() {
  return (
    <>
      <PageHeader
        title="Open RFQs"
        description="Requests accepting quotes right now. Open one to read the details and send your quote before its deadline."
      />
      <VendorRfqBrowse />
    </>
  );
}
