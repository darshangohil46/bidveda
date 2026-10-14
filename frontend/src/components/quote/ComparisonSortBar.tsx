import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComparisonSort } from "@/types/enums";
import { nextSort, SORT_OPTIONS } from "@/utils/comparison";

interface ComparisonSortBarProps {
  sort: ComparisonSort;
  onChange: (sort: ComparisonSort) => void;
  loading: boolean;
}

/** "Sort by" buttons above the quotes. The active one shows an arrow; pressing it again reverses it. */
export function ComparisonSortBar({
  sort,
  onChange,
  loading,
}: ComparisonSortBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="t-small mr-1 text-ink-3">Sort by</span>
      <div
        role="group"
        aria-label="Sort quotes"
        className="flex flex-wrap gap-1"
      >
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.first || sort === option.reverse;
          const reversed = sort === option.reverse;
          return (
            <button
              key={option.first}
              type="button"
              aria-pressed={active}
              title={
                option.reverse
                  ? `Click again to reverse (${option.hint} by default)`
                  : option.hint
              }
              onClick={() => onChange(nextSort(sort, option))}
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[0.8125rem] transition-colors",
                active
                  ? "bg-ink font-medium text-paper"
                  : "text-ink-2 hover:bg-sunken",
              )}
            >
              {option.label}
              {active &&
                option.reverse &&
                (reversed ? (
                  <ArrowDown className="size-3.5" />
                ) : (
                  <ArrowUp className="size-3.5" />
                ))}
            </button>
          );
        })}
      </div>
      {loading && <span className="t-small text-ink-3">Updating...</span>}
    </div>
  );
}
