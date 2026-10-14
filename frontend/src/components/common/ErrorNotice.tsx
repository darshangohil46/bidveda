"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/utils/general";

interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-sm border border-rust/30 bg-rust-soft px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rust" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] text-ink">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
