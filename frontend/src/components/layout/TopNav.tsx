"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/ui";

/** The links in the top bar. The one for the page you are on is highlighted. */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {items.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-sm px-2.5 py-1.5 text-[0.875rem] whitespace-nowrap transition-colors",
              active
                ? "bg-pine-soft font-medium text-pine-dark"
                : "text-ink-2 hover:bg-line/60 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
