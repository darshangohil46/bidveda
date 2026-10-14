import type { QuoteRevision } from "@/types/rfq";
import { formatDateTime, formatDays, formatMoney } from "@/utils/general";

/** Every version of the quote, newest first. Earlier versions are never edited or deleted. */
export function QuoteRevisions({
  revisions,
  currency,
}: {
  revisions: QuoteRevision[];
  currency: string;
}) {
  if (revisions.length < 2) return null;
  const newestFirst = [...revisions].sort(
    (a, b) => b.revisionNo - a.revisionNo,
  );

  return (
    <details className="group rounded-sm border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.875rem] font-medium text-ink">
        Revision history
        <span className="t-figure text-[0.75rem] font-normal text-ink-3">
          {revisions.length} versions
        </span>
      </summary>
      <ol className="divide-y border-t">
        {newestFirst.map((revision, index) => (
          <li
            key={revision.revisionNo}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-2.5"
          >
            <span className="t-figure text-[0.75rem] text-ink-3">
              v{revision.revisionNo}
              {index === 0 && " now"}
            </span>
            <span className="text-[0.8125rem] text-ink-2">
              {formatDateTime(revision.createdAt)} ·{" "}
              {formatDays(revision.deliveryDays)}
            </span>
            <span className="t-figure text-[0.875rem] text-ink">
              {formatMoney(revision.totalMinor, currency)}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
