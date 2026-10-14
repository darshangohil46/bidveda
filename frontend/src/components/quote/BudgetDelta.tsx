import { budgetDeltaPercent } from "@/utils/comparison";

/** "12% under budget" or "5% over budget". Shows nothing when the RFQ has no budget. */
export function BudgetDelta({
  totalMinor,
  budgetMinor,
  className,
}: {
  totalMinor: number;
  budgetMinor: number | null;
  className?: string;
}) {
  const delta = budgetDeltaPercent(totalMinor, budgetMinor);
  if (delta === null) return null;

  return (
    <span className={className}>
      <span className="t-figure">{Math.abs(delta)}%</span>{" "}
      {delta <= 0 ? "under" : "over"} budget
    </span>
  );
}
