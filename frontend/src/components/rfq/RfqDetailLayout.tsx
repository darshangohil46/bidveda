import { AttachmentList } from "@/components/common/AttachmentList";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LineItemsTable } from "@/components/rfq/LineItemsTable";
import { RfqFacts } from "@/components/rfq/RfqFacts";
import { RfqHistory } from "@/components/rfq/RfqHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/types/enums";
import type { Attachment, RfqDetail } from "@/types/rfq";
import { roleHome } from "@/utils/constant";

/** Grey placeholder shown while an RFQ is loading. */
export function RfqDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="grid gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

interface RfqDetailLayoutProps {
  rfq: RfqDetail;
  role: UserRole;
  /** Shown next to the status: the category for a buyer, the buyer's company for a vendor. */
  subtitle: string;
  /** Buttons at the top right of the page. */
  actions: React.ReactNode;
  /** Extra facts added to the facts box. */
  facts?: React.ReactNode;
  /** A box above the facts box (the vendor's own quote summary). */
  aside?: React.ReactNode;
  /** An extra section between the line items and the files. */
  extra?: React.ReactNode;
  /** Which files show a remove button. Nobody can remove files when this is left out. */
  canRemoveFile?: (file: Attachment) => boolean;
  /** Called after a file was removed, so the page can load the RFQ again. */
  onFileRemoved?: () => void;
}

/**
 * The page frame both roles share: what is needed, the line items, files and status history on the
 * left, the facts on the right. The buyer and vendor pages only decide what is different.
 */
export function RfqDetailLayout({
  rfq,
  role,
  subtitle,
  actions,
  facts,
  aside,
  extra,
  canRemoveFile,
  onFileRemoved,
}: RfqDetailLayoutProps) {
  return (
    <>
      <PageHeader
        title={rfq.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge kind="rfq" status={rfq.status} />
            <span className="text-ink-3">{subtitle}</span>
          </span>
        }
        back={{
          href: roleHome(role),
          label: role === UserRole.BUYER ? "My RFQs" : "Open RFQs",
        }}
        actions={actions}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="grid min-w-0 content-start gap-9">
          <section aria-labelledby="rfq-description">
            <h2 id="rfq-description" className="t-h2 mb-2">
              What is needed
            </h2>
            <p className="t-body max-w-prose whitespace-pre-line text-ink-2">
              {rfq.description}
            </p>
          </section>

          <section aria-labelledby="rfq-items">
            <h2 id="rfq-items" className="t-h2 mb-3">
              Line items
            </h2>
            <LineItemsTable items={rfq.lineItems} />
          </section>

          {extra}

          <section aria-labelledby="rfq-files">
            <h2 id="rfq-files" className="t-h2 mb-3">
              Specification files
            </h2>
            <AttachmentList
              attachments={rfq.attachments}
              canRemove={canRemoveFile}
              onRemoved={onFileRemoved}
              emptyText="The buyer has not attached any files."
            />
          </section>

          <section aria-labelledby="rfq-history">
            <h2 id="rfq-history" className="t-h2 mb-4">
              Status history
            </h2>
            <RfqHistory
              rfqId={rfq.id}
              role={role}
              refreshKey={`${rfq.status}:${rfq.quoteCount ?? rfq.myQuote?.revisionNo ?? 0}`}
            />
          </section>
        </div>

        <aside className="grid content-start gap-4">
          {aside}
          <RfqFacts rfq={rfq}>{facts}</RfqFacts>
        </aside>
      </div>
    </>
  );
}
