import Link from "next/link";
import { Countdown } from "@/components/common/Countdown";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import { RfqStatus, UserRole } from "@/types/enums";
import type { RfqListItem } from "@/types/rfq";
import { QUOTE_STATUS_META, rfqRoute } from "@/utils/constant";
import { formatDateTime, formatLocation, formatMoney } from "@/utils/general";

export const RFQ_GRID = "md:grid-cols-[minmax(0,1fr)_7.5rem_13rem_8.5rem]";
/** The same columns plus a narrow one at the end for a button. */
export const RFQ_GRID_WITH_ACTION =
  "md:grid-cols-[minmax(0,1fr)_7.5rem_13rem_8.5rem_2rem]";

interface RfqRowProps {
  rfq: RfqListItem;
  variant: UserRole;
  /** A button at the end of the row, such as the buyer's "Edit". It works on its own, apart from the row's link. */
  action?: React.ReactNode;
  /** Set when the list has an action column, so every row (even one with no button) keeps the same columns as the header. */
  showActionColumn?: boolean;
}

/** One RFQ as a dense, scannable row: what it is, where it stands, when it closes, what it is worth. */
export function RfqRow({
  rfq,
  variant,
  action,
  showActionColumn = false,
}: RfqRowProps) {
  const isOpen = rfq.status === RfqStatus.PUBLISHED;
  const meta = [
    rfq.category,
    formatLocation([rfq.deliveryCity, rfq.deliveryState]),
    `${rfq.lineItemCount} ${rfq.lineItemCount === 1 ? "item" : "items"}`,
    variant === UserRole.VENDOR ? rfq.buyerCompany : null,
  ].filter(Boolean);

  return (
    // The title is the link, stretched over the whole row, so the "Edit" button can sit on top of it.
    <div
      className={cn(
        "group relative grid gap-2 px-4 py-3.5 transition-colors hover:bg-sunken/70 focus-within:bg-sunken/70 md:items-center md:gap-4",
        showActionColumn ? RFQ_GRID_WITH_ACTION : RFQ_GRID,
      )}
    >
      <div className="min-w-0">
        <Link
          href={rfqRoute(variant, rfq.id)}
          className="block truncate font-medium text-ink outline-none group-hover:text-pine after:absolute after:inset-0"
        >
          {rfq.title}
        </Link>
        <p className="mt-0.5 truncate text-[0.8125rem] text-ink-3">
          {meta.join(" · ")}
        </p>
      </div>

      <div className="flex items-center gap-3 md:block">
        {variant === UserRole.VENDOR && rfq.myQuote ? (
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                QUOTE_STATUS_META[rfq.myQuote.status].dot,
              )}
            />
            Quoted
          </span>
        ) : (
          <StatusBadge kind="rfq" status={rfq.status} />
        )}
        <span className="text-[0.8125rem] text-ink-3 md:hidden">·</span>
        <p className="t-small text-ink-2 md:hidden">
          {formatDateTime(rfq.deadline)}
        </p>
      </div>

      <div className="hidden md:block">
        <p className="t-small text-ink">{formatDateTime(rfq.deadline)}</p>
        {isOpen ? (
          <Countdown deadline={rfq.deadline} className="text-[0.75rem]" />
        ) : (
          <p className="text-[0.75rem] text-ink-3">Deadline passed</p>
        )}
      </div>

      <div className="t-figure text-[0.8125rem] text-ink-2 md:text-right">
        {variant === UserRole.BUYER ? (
          <span>
            {rfq.quoteCount ?? 0}{" "}
            {(rfq.quoteCount ?? 0) === 1 ? "quote" : "quotes"}
          </span>
        ) : rfq.myQuote ? (
          <span className="text-ink">
            {formatMoney(rfq.myQuote.totalMinor, rfq.currency)}
          </span>
        ) : (
          <span className="text-ink-3">
            {rfq.budgetMinor
              ? `Budget ${formatMoney(rfq.budgetMinor, rfq.currency)}`
              : "No budget set"}
          </span>
        )}
      </div>

      {showActionColumn && (
        <div className="relative z-10 justify-self-end max-md:absolute max-md:top-2.5 max-md:right-3">
          {action}
        </div>
      )}
    </div>
  );
}
