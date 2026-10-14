import { ComparisonSort } from "@/types/enums";
import type { Quote, QuoteItem } from "@/types/rfq";
import type { Highlights } from "@/types/ui";

/** Which quotes are cheapest and fastest. Ties are all highlighted. Only meaningful with 2+ quotes. */
export function findHighlights(quotes: Quote[]): Highlights {
  const empty: Highlights = {
    lowestTotal: new Set(),
    fastestDelivery: new Set(),
  };
  if (quotes.length < 2) return empty;

  const minTotal = Math.min(...quotes.map((quote) => quote.totalMinor));
  const minDays = Math.min(...quotes.map((quote) => quote.deliveryDays));
  return {
    lowestTotal: new Set(
      quotes
        .filter((quote) => quote.totalMinor === minTotal)
        .map((quote) => quote.id),
    ),
    fastestDelivery: new Set(
      quotes
        .filter((quote) => quote.deliveryDays === minDays)
        .map((quote) => quote.id),
    ),
  };
}

export function itemFor(
  quote: Quote,
  lineItemId: string,
): QuoteItem | undefined {
  return quote.items.find((item) => item.lineItemId === lineItemId);
}

/** Percent difference from the budget, e.g. -12 means 12% under. Null when there is no budget. */
export function budgetDeltaPercent(
  totalMinor: number,
  budgetMinor: number | null,
): number | null {
  if (!budgetMinor) return null;
  const percent = ((totalMinor - budgetMinor) / budgetMinor) * 100;
  // Round the size, then restore the sign, so 12.5% under and 12.5% over read the same way.
  return Math.sign(percent) * Math.round(Math.abs(percent));
}

/** One "Sort by" button. Pressing the active one again flips it, when it has an opposite. */
export interface SortOption {
  label: string;
  first: ComparisonSort;
  reverse: ComparisonSort | null;
  hint: string;
}

export const SORT_OPTIONS: SortOption[] = [
  {
    label: "Total price",
    first: ComparisonSort.TOTAL_ASC,
    reverse: ComparisonSort.TOTAL_DESC,
    hint: "lowest first",
  },
  {
    label: "Delivery time",
    first: ComparisonSort.DELIVERY_ASC,
    reverse: ComparisonSort.DELIVERY_DESC,
    hint: "fastest first",
  },
  {
    label: "Submitted",
    first: ComparisonSort.SUBMITTED_ASC,
    reverse: null,
    hint: "earliest first",
  },
];

/** The sort to use after `option` is pressed while `current` is active. */
export function nextSort(
  current: ComparisonSort,
  option: SortOption,
): ComparisonSort {
  if (current === option.first && option.reverse) return option.reverse;
  return option.first;
}
