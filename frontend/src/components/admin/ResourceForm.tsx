"use client";

import { ResourceFormBody } from "@/components/admin/ResourceFormBody";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { adminService } from "@/services/admin.service";
import type { ResourceMeta } from "@/types/admin";
import { FormMode } from "@/types/enums";

interface ResourceFormProps {
  meta: ResourceMeta;
  allResources: ResourceMeta[];
  mode: FormMode;
  recordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function titleFor(meta: ResourceMeta, mode: FormMode): string {
  if (mode === FormMode.CREATE) return `New ${meta.label.toLowerCase()}`;
  if (mode === FormMode.EDIT) return `Edit ${meta.label.toLowerCase()}`;
  return meta.label;
}

/**
 * The modal for creating, editing or just viewing one record of any table.
 * It loads the record first (when there is one), then shows the form inside.
 */
export function ResourceForm({
  meta,
  allResources,
  mode,
  recordId,
  open,
  onOpenChange,
  onSaved,
}: ResourceFormProps) {
  const needsRecord = mode !== FormMode.CREATE && !!recordId;
  const { data, error, reload } = useApiQuery(
    () => adminService.get(meta.key, recordId as string),
    `${meta.key}:${recordId}`,
    {
      enabled: open && needsRecord,
    },
  );

  const ready =
    mode === FormMode.CREATE || (data !== null && data.id === recordId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="gap-1.5 border-b px-5 py-4 pr-12">
          <DialogTitle className="font-serif text-[1.25rem] leading-tight font-normal tracking-tight">
            {titleFor(meta, mode)}
          </DialogTitle>
          <DialogDescription>
            {mode === FormMode.VIEW
              ? "Read-only: your role cannot change this record."
              : "Fields marked * are required."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="px-5 py-4">
            <ErrorNotice error={error} onRetry={reload} />
          </div>
        )}
        {!error && !ready && (
          <div className="grid gap-3 px-5 py-4" aria-busy="true">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {!error && ready && (
          <ResourceFormBody
            key={recordId ?? "new"}
            meta={meta}
            allResources={allResources}
            mode={mode}
            record={mode === FormMode.CREATE ? null : data}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
