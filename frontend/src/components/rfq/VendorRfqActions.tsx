import Link from "next/link";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RfqStatus } from "@/types/enums";
import type { RfqDetail } from "@/types/rfq";
import { rfqQuoteRoute } from "@/utils/constant";

/** A vendor can send a quote, or revise the one they sent, while the RFQ is open. */
export function VendorRfqActions({ rfq }: { rfq: RfqDetail }) {
  if (rfq.status !== RfqStatus.PUBLISHED) return null;

  return (
    <Button asChild>
      <Link href={rfqQuoteRoute(rfq.id)}>
        <Send className="size-4" />
        {rfq.myQuote ? "Revise your quote" : "Submit a quote"}
      </Link>
    </Button>
  );
}
