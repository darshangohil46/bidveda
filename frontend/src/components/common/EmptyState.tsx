import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** A plain sentence and one next step. No illustration. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1 rounded-sm border border-dashed border-line-strong px-5 py-8",
        className,
      )}
    >
      <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
      {description && (
        <p className="max-w-prose text-[0.8125rem] text-ink-2">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
