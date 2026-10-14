import { cn } from "@/lib/utils";
import type { RfqStatus } from "@/types/enums";
import { RFQ_STATUS_META, RFQ_STATUS_ORDER } from "@/utils/constant";

/** "" stands for "All". */
export type StatusFilter = RfqStatus | "";

interface RfqStatusTabsProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  /** How many RFQs each status has. Not shown until the list has loaded. */
  counts?: Record<RfqStatus, number>;
}

/** Tabs that filter the buyer's RFQs by status: All, Draft, Open, Closed, Awarded, each with its count. */
export function RfqStatusTabs({ value, onChange, counts }: RfqStatusTabsProps) {
  const total = counts
    ? Object.values(counts).reduce((sum, count) => sum + count, 0)
    : null;

  const tabs: Array<{
    value: StatusFilter;
    label: string;
    count: number | null;
  }> = [
    { value: "", label: "All", count: total },
    ...RFQ_STATUS_ORDER.map((status) => ({
      value: status,
      label: RFQ_STATUS_META[status].label,
      count: counts ? counts[status] : null,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="-mx-1 flex gap-1 overflow-x-auto px-1"
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.8125rem] transition-colors",
              active
                ? "bg-ink font-medium text-paper"
                : "text-ink-2 hover:bg-sunken",
            )}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={cn(
                  "t-figure text-[0.75rem]",
                  active ? "text-paper/70" : "text-ink-3",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
