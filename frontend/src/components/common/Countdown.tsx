"use client";

import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/general";

interface CountdownProps {
  deadline: string;
  /** serverTime - clientTime when the data was fetched, so a wrong device clock does not lie. */
  skewMs?: number;
  className?: string;
}

const URGENT_BELOW_MS = 24 * 60 * 60 * 1000;

/** "Closes in 2 days 4 hours" in ink; turns amber under 24 hours; "Closed ..." afterwards. */
export function Countdown({ deadline, skewMs = 0, className }: CountdownProps) {
  const now = useNow(30_000);
  if (now === 0) return null;

  const remaining = new Date(deadline).getTime() - (now + skewMs);
  if (remaining <= 0) {
    return (
      <span className={cn("text-ink-3", className)}>
        Closed {formatDuration(-remaining)} ago
      </span>
    );
  }
  return (
    <span
      className={cn(
        remaining < URGENT_BELOW_MS ? "font-medium text-amber" : "text-ink-2",
        className,
      )}
    >
      Closes in {formatDuration(remaining)}
    </span>
  );
}
