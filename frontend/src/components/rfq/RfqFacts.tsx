import { Countdown } from "@/components/common/Countdown";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RfqStatus } from "@/types/enums";
import type { RfqDetail } from "@/types/rfq";
import { formatDateTime, formatLocation, formatMoney } from "@/utils/general";

/** One label and its value inside the facts box. Also used by the pages that add their own facts. */
export function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 py-3 first:pt-0 last:pb-0">
      <dt className="t-caption">{label}</dt>
      <dd className="text-[0.875rem] text-ink">{children}</dd>
    </div>
  );
}

/**
 * The facts that decide what to do next, kept in a narrow box on the right.
 * `children` are extra facts a page wants to add (the buyer sees "Quotes received", the vendor sees "Buyer").
 */
export function RfqFacts({
  rfq,
  children,
}: {
  rfq: RfqDetail;
  children?: React.ReactNode;
}) {
  const isOpen = rfq.status === RfqStatus.PUBLISHED;

  return (
    <dl className="divide-y rounded-sm border bg-card p-4">
      <Fact label="Status">
        <StatusBadge kind="rfq" status={rfq.status} />
      </Fact>
      <Fact label="Submission deadline">
        <span className="t-figure block">{formatDateTime(rfq.deadline)}</span>
        {isOpen ? (
          <Countdown
            deadline={rfq.deadline}
            skewMs={rfq.clockSkewMs}
            className="text-[0.8125rem]"
          />
        ) : (
          <span className="text-[0.8125rem] text-ink-3">
            No more quotes accepted
          </span>
        )}
      </Fact>
      <Fact label="Budget">
        <span className="t-figure">
          {rfq.budgetMinor
            ? formatMoney(rfq.budgetMinor, rfq.currency)
            : "Not specified"}
        </span>
      </Fact>
      <Fact label="Category">{rfq.category}</Fact>
      <Fact label="Deliver to">
        {rfq.deliveryAddress && (
          <span className="block">{rfq.deliveryAddress}</span>
        )}
        <span className="block">
          {formatLocation([rfq.deliveryCity, rfq.deliveryState])}
        </span>
        <span className="block text-ink-2">
          {rfq.deliveryCountry}{" "}
          <span className="t-figure">{rfq.deliveryPincode}</span>
        </span>
      </Fact>
      {children}
      {rfq.publishedAt && (
        <Fact label="Published">{formatDateTime(rfq.publishedAt)}</Fact>
      )}
      {rfq.awardedAt && (
        <Fact label="Awarded">{formatDateTime(rfq.awardedAt)}</Fact>
      )}
    </dl>
  );
}
