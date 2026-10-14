import type { Metadata } from "next";
import { BuyerRfqList } from "@/components/rfq/BuyerRfqList";

export const metadata: Metadata = { title: "My RFQs" };

export default function Page() {
  return <BuyerRfqList />;
}
