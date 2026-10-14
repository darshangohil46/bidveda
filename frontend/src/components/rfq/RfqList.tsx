import { LoadingRows } from "@/components/common/LoadingRows";
import {
  RFQ_GRID,
  RFQ_GRID_WITH_ACTION,
  RfqRow,
} from "@/components/rfq/RfqRow";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";
import type { RfqListItem } from "@/types/rfq";

interface RfqListProps {
  items: RfqListItem[];
  variant: UserRole;
  loading?: boolean;
  /** Shown when there are no items and nothing is loading. */
  empty: React.ReactNode;
  /** A button for the end of each row (return null for rows that have none). */
  renderAction?: (rfq: RfqListItem) => React.ReactNode;
}

/** Column header + rows. Keeps the old page visible (dimmed) while the next one loads. */
export function RfqList({
  items,
  variant,
  loading,
  empty,
  renderAction,
}: RfqListProps) {
  if (items.length === 0) {
    return loading ? <LoadingRows /> : <>{empty}</>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border bg-card transition-opacity",
        loading && "opacity-60",
      )}
    >
      <div
        className={cn(
          "t-caption hidden gap-4 border-b bg-sunken px-4 py-2 md:grid",
          renderAction ? RFQ_GRID_WITH_ACTION : RFQ_GRID,
        )}
      >
        <span>RFQ</span>
        <span>Status</span>
        <span>Deadline</span>
        <span className="text-right">
          {variant === UserRole.BUYER ? "Quotes" : "Your quote / budget"}
        </span>
        {renderAction && <span />}
      </div>
      <div className="divide-y">
        {items.map((rfq) => (
          <RfqRow
            key={rfq.id}
            rfq={rfq}
            variant={variant}
            action={renderAction?.(rfq)}
            showActionColumn={!!renderAction}
          />
        ))}
      </div>
    </div>
  );
}
