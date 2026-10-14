"use client";

import { ErrorNotice } from "@/components/common/ErrorNotice";
import { RfqForm } from "@/components/rfq/RfqForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { rfqService } from "@/services/rfq.service";
import { canEditRfq } from "@/lib/rfq-form";
import { RfqStatus } from "@/types/enums";

interface RfqFormDialogProps {
  open: boolean;
  /** The draft to edit, or null to start a new RFQ. */
  rfqId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Called after the RFQ was saved; the page then reloads what it shows. */
  onSaved: () => void;
}

/**
 * The modal used to create an RFQ and to edit a draft, from the list and from the RFQ page.
 * To edit, it loads the RFQ first and then shows the form filled in. A draft and an open RFQ can be
 * edited; once the deadline has passed (closed, awarded) it is locked.
 */
export function RfqFormDialog({
  open,
  rfqId,
  onOpenChange,
  onSaved,
}: RfqFormDialogProps) {
  const { data, error, reload } = useApiQuery(
    (signal) => rfqService.get(rfqId as string, signal),
    `${rfqId}`,
    {
      enabled: open && rfqId !== null,
    },
  );

  const loaded = rfqId === null || (data !== null && data.id === rfqId);
  const locked =
    data !== null &&
    rfqId !== null &&
    data.id === rfqId &&
    !canEditRfq(data.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="gap-1.5 border-b px-5 py-4 pr-12">
          <DialogTitle className="font-serif text-[1.25rem] leading-tight font-normal tracking-tight">
            {!rfqId
              ? "New RFQ"
              : data?.status === RfqStatus.PUBLISHED
                ? "Edit RFQ"
                : "Edit draft"}
          </DialogTitle>
          <DialogDescription>
            {!rfqId
              ? "Describe what you need, then publish it to vendors. Save a draft first if you are not ready."
              : data?.status === RfqStatus.PUBLISHED
                ? "Vendors can already see this RFQ, so your changes show to them straight away."
                : "Change anything until you publish. Fields marked * are required."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="px-5 py-4">
            <ErrorNotice error={error} onRetry={reload} />
          </div>
        )}
        {!error && !loaded && (
          <div className="grid gap-3 px-5 py-4" aria-busy="true">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {!error && loaded && locked && (
          <p className="px-5 py-6 text-[0.875rem] text-ink-2">
            This RFQ is closed, so it can no longer be edited. Every vendor
            priced the same request.
          </p>
        )}
        {!error && loaded && !locked && (
          <RfqForm
            key={rfqId ?? "new"}
            initial={rfqId ? (data ?? undefined) : undefined}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
