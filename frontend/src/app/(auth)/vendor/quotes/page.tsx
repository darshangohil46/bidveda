import type { Metadata } from "next";
import { VendorQuotesPage } from "@/components/quote/VendorQuotesPage";

export const metadata: Metadata = { title: "My quotes" };

export default function Page() {
  return <VendorQuotesPage />;
}
