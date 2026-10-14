import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingRowsProps {
  rows?: number;
  className?: string;
}

/** Placeholder lines the same height as a real table row, so the page does not jump. */
export function LoadingRows({ rows = 5, className }: LoadingRowsProps) {
  return (
    <div
      className={cn("divide-y rounded-sm border bg-card", className)}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex h-[3.25rem] items-center gap-4 px-4">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="ml-auto h-3.5 w-16" />
          <Skeleton className="hidden h-3.5 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}
