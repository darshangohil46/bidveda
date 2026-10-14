"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import type { Quote } from "@/types/rfq";
import { formatDays, formatMoney } from "@/utils/general";

interface AwardDialogProps {
  quote: Quote | null;
  currency: string;
  otherQuotes: number;
  onClose: () => void;
  onConfirm: (quote: Quote, note: string) => Promise<void>;
}

/** The irreversible step, so it states exactly what will happen before it happens. */
export function AwardDialog({
  quote,
  currency,
  otherQuotes,
  onClose,
  onConfirm,
}: AwardDialogProps) {
  const [note, setNote] = useState("");

  return (
    <ConfirmDialog
      open={quote !== null}
      onOpenChange={(open) => {
        if (!open) {
          setNote("");
          onClose();
        }
      }}
      title={`Award to ${quote?.vendor?.companyName ?? "this vendor"}?`}
      description={
        quote ? (
          <>
            Accept their quote of{" "}
            <strong className="t-figure text-ink">
              {formatMoney(quote.totalMinor, currency)}
            </strong>{" "}
            with delivery in{" "}
            <strong className="t-figure text-ink">
              {formatDays(quote.deliveryDays)}
            </strong>
            .{" "}
            {otherQuotes > 0
              ? `The other ${otherQuotes} ${otherQuotes === 1 ? "quote" : "quotes"} will be rejected. `
              : ""}
            This cannot be undone.
          </>
        ) : null
      }
      confirmLabel="Award RFQ"
      onConfirm={async () => {
        if (quote) await onConfirm(quote, note.trim());
        setNote("");
      }}
    >
      <label className="grid gap-1.5 text-[0.8125rem] font-medium text-ink">
        Reason (optional, kept in the history)
        <Textarea
          value={note}
          rows={2}
          maxLength={500}
          placeholder="e.g. Faster delivery outweighs the small price difference."
          onChange={(event) => setNote(event.target.value)}
          className="bg-card font-normal"
        />
      </label>
    </ConfirmDialog>
  );
}
