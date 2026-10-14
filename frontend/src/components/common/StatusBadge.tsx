import { cn } from "@/lib/utils";
import { QuoteStatus, RfqStatus } from "@/types/enums";
import { QUOTE_STATUS_META, RFQ_STATUS_META } from "@/utils/constant";

type StatusBadgeProps =
  | { kind: "rfq"; status: RfqStatus; className?: string }
  | { kind: "quote"; status: QuoteStatus; className?: string };

/** A small dot and the word. Colour carries meaning only here, never as a filled block. */
export function StatusBadge(props: StatusBadgeProps) {
  const meta =
    props.kind === "rfq"
      ? RFQ_STATUS_META[props.status]
      : QUOTE_STATUS_META[props.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink",
        props.className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
