import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}

/** Title in the serif, one line of context, actions on the right. Stacks on small screens. */
export function PageHeader({
  title,
  description,
  back,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-0.5 text-[0.8125rem] text-ink-3 transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="t-h1 text-balance">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-[0.9375rem] text-ink-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
