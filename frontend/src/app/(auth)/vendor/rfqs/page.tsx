import type { Metadata } from "next";
import { VendorRfqsPage } from "@/components/rfq/VendorRfqsPage";

export const metadata: Metadata = { title: "Open RFQs" };

export default function Page() {
  return <VendorRfqsPage />;
}
