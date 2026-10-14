"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { adminResourceHref, getIcon } from "@/components/admin/admin-routes";
import { useAdmin } from "@/components/admin/AdminProvider";
import { cn } from "@/lib/utils";
import { PermissionAction } from "@/types/enums";
import { ROUTES } from "@/utils/constant";

/** Sidebar built from the backend registry: groups and entries the admin may read, nothing hard-coded. */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { resources, can } = useAdmin();

  const groups = new Map<string, { icon: string; items: typeof resources }>();
  for (const resource of resources) {
    if (!can(resource.key, PermissionAction.READ)) continue;
    const group = groups.get(resource.group) ?? {
      icon: resource.groupIcon,
      items: [],
    };
    group.items.push(resource);
    groups.set(resource.group, group);
  }

  const link = (
    href: string,
    label: string,
    Icon: ReturnType<typeof getIcon>,
    active: boolean,
  ) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[0.8125rem] transition-colors",
        active
          ? "bg-pine-soft font-medium text-pine-dark"
          : "text-ink-2 hover:bg-line/60 hover:text-ink",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );

  return (
    <nav aria-label="Admin" className="grid gap-5">
      {link(
        ROUTES.adminDashboard,
        "Dashboard",
        LayoutDashboard,
        pathname === ROUTES.adminDashboard,
      )}
      {[...groups.entries()].map(([name, group]) => (
        <div key={name} className="grid gap-0.5">
          <p className="t-caption flex items-center gap-1.5 px-2.5 pb-1">
            {(() => {
              const GroupIcon = getIcon(group.icon);
              return <GroupIcon className="size-3.5" />;
            })()}
            {name}
          </p>
          {group.items.map((resource) => {
            const href = adminResourceHref(resource.key);
            return link(
              href,
              resource.labelPlural,
              getIcon(resource.icon),
              pathname === href,
            );
          })}
        </div>
      ))}
    </nav>
  );
}
