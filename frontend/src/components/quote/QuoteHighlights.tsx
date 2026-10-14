import type { Highlights } from "@/types/ui";

/** Small text tags (not coloured fills) marking the cheapest and the fastest quote. */
export function QuoteHighlights({
  quoteId,
  highlights,
}: {
  quoteId: string;
  highlights: Highlights;
}) {
  const cheapest = highlights.lowestTotal.has(quoteId);
  const fastest = highlights.fastestDelivery.has(quoteId);
  if (!cheapest && !fastest) return null;

  return (
    <span className="flex flex-wrap gap-1.5">
      {cheapest && (
        <span className="rounded-sm border border-pine/40 px-1.5 py-px text-[0.6875rem] font-medium text-pine">
          Lowest total
        </span>
      )}
      {fastest && (
        <span className="rounded-sm border border-slate-blue/40 px-1.5 py-px text-[0.6875rem] font-medium text-slate-blue">
          Fastest
        </span>
      )}
    </span>
  );
}
