"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { attachmentService } from "@/services/attachment.service";
import type { Attachment } from "@/types/rfq";
import { formatFileSize, getErrorMessage } from "@/utils/general";

interface AttachmentListProps {
  attachments: Attachment[];
  /** Show a delete button on files the signed-in person may remove. */
  canRemove?: (attachment: Attachment) => boolean;
  onRemoved?: (attachment: Attachment) => void;
  emptyText?: string;
}

export function AttachmentList({
  attachments,
  canRemove,
  onRemoved,
  emptyText = "No files attached.",
}: AttachmentListProps) {
  const { error } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function download(attachment: Attachment) {
    setBusyId(attachment.id);
    try {
      await attachmentService.download(attachment);
    } catch (caught) {
      error("Could not download the file", getErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(attachment: Attachment) {
    setBusyId(attachment.id);
    try {
      await attachmentService.remove(attachment.id);
      onRemoved?.(attachment);
    } catch (caught) {
      error("Could not remove the file", getErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  if (attachments.length === 0)
    return <p className="t-small text-ink-3">{emptyText}</p>;

  return (
    <ul className="divide-y rounded-sm border bg-card">
      {attachments.map((attachment) => {
        const Icon = attachment.mimeType.includes("pdf")
          ? FileText
          : FileSpreadsheet;
        const busy = busyId === attachment.id;
        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <Icon className="size-4 shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium text-ink">
                {attachment.originalName}
              </p>
              <p className="t-figure text-[0.75rem] text-ink-3">
                {formatFileSize(attachment.sizeBytes)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => download(attachment)}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span className="sr-only sm:not-sr-only">Download</span>
            </Button>
            {canRemove?.(attachment) && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${attachment.originalName}`}
                disabled={busy}
                onClick={() => remove(attachment)}
              >
                <Trash2 className="size-4 text-rust" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
