"use client";

import { Award, ListPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteStatus, RfqStatus } from "@/types/enums";
import type { Quote } from "@/types/rfq";

interface QuoteActionsProps {
  rfqStatus: RfqStatus;
  quote: Quote;
  /** Id of the quote an action is currently running for. */
  busyId: string | null;
  onShortlist: (quote: Quote) => void;
  onAward: (quote: Quote) => void;
}

/** What the buyer can do with one quote right now. Awarding only opens once the deadline has passed. */
export function QuoteActions({
  rfqStatus,
  quote,
  busyId,
  onShortlist,
  onAward,
}: QuoteActionsProps) {
  if (rfqStatus === RfqStatus.AWARDED) {
    return <span className="text-[0.75rem] text-ink-3">Decision recorded</span>;
  }
  if (rfqStatus !== RfqStatus.CLOSED) {
    return (
      <span className="text-[0.75rem] text-ink-3">
        Awarding opens at the deadline
      </span>
    );
  }

  const busy = busyId === quote.id;
  return (
    <div className="flex flex-wrap gap-2">
      {quote.status === QuoteStatus.SUBMITTED && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onShortlist(quote)}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ListPlus className="size-3.5" />
          )}
          Shortlist
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => onAward(quote)}
      >
        <Award className="size-3.5" /> Award
      </Button>
    </div>
  );
}
