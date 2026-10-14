"use client";

import Link from "next/link";
import { adminResourceHref, getIcon } from "@/components/admin/admin-routes";
import { useAdmin } from "@/components/admin/AdminProvider";
import { ErrorNotice } from "@/components/common/ErrorNotice";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/use-api-query";
import { adminService } from "@/services/admin.service";
import { PermissionAction } from "@/types/enums";

/** One request returns the row count of every table this admin may read (admin.txt: dashboard/counts). */
export function AdminDashboardPage() {
  const { admin, resources, can } = useAdmin();
  const { data, error, reload } = useApiQuery(
    () => adminService.counts(),
    "admin-counts",
  );

  const groups = new Map<string, typeof resources>();
  for (const resource of resources) {
    if (!can(resource.key, PermissionAction.READ)) continue;
    groups.set(resource.group, [
      ...(groups.get(resource.group) ?? []),
      resource,
    ]);
  }

  return (
    <>
      <PageHeader
        title="Admin overview"
        description={
          admin
            ? `Signed in as ${admin.name} (${admin.role}). Counts include only what your role may read.`
            : undefined
        }
      />

      {error && <ErrorNotice error={error} onRetry={reload} />}

      <div className="grid gap-10">
        {[...groups.entries()].map(([group, items]) => (
          <section key={group} aria-label={group}>
            <h2 className="t-h2 mb-3">{group}</h2>
            <ul className="divide-y rounded-sm border bg-card">
              {items.map((resource) => {
                const Icon = getIcon(resource.icon);
                return (
                  <li key={resource.key}>
                    <Link
                      href={adminResourceHref(resource.key)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sunken/70"
                    >
                      <Icon className="size-4 text-ink-3" />
                      <span className="flex-1 text-[0.875rem] text-ink">
                        {resource.labelPlural}
                      </span>
                      {data ? (
                        <span className="t-figure text-[1.125rem] text-ink">
                          {data[resource.key] ?? 0}
                        </span>
                      ) : (
                        <Skeleton className="h-5 w-10" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
