"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** 1 … 4 5 6 … 12, always keeping first, last and the neighbours of the current page. */
function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  pages.forEach((n, index) => {
    if (index > 0 && n - pages[index - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row",
        className,
      )}
    >
      <p className="t-small text-ink-3">
        Showing{" "}
        <span className="t-figure text-ink-2">
          {from}-{to}
        </span>{" "}
        of <span className="t-figure text-ink-2">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((entry, index) =>
            entry === "gap" ? (
              <span
                key={`gap-${index}`}
                className="px-1.5 text-ink-3"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant={entry === page ? "default" : "ghost"}
                size="sm"
                className="t-figure min-w-8"
                aria-current={entry === page ? "page" : undefined}
                onClick={() => onPageChange(entry)}
              >
                {entry}
              </Button>
            ),
          )}
        </div>
        <span className="t-small px-2 text-ink-2 sm:hidden">
          {page} / {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
