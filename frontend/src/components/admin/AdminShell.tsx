"use client";

import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthStatus } from "@/types/enums";
import { ROUTES } from "@/utils/constant";
import { initials } from "@/utils/general";

function AdminIdentity() {
  const { admin, logout } = useAdmin();
  if (!admin) return null;
  return (
    <div className="grid gap-2 border-t pt-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6875rem] font-medium text-paper">
          {initials(admin.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">
            {admin.name}
          </span>
          <span className="block truncate text-[0.75rem] text-ink-3">
            {admin.role}
          </span>
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start"
        onClick={() => void logout()}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}

/** Same bones as the buyer/vendor shell, so the two areas feel like one product with a different job. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { status } = useAdmin();
  const [open, setOpen] = useState(false);

  if (status !== AuthStatus.AUTHENTICATED) {
    return (
      <div
        className="min-h-dvh md:grid md:grid-cols-[15.5rem_1fr]"
        aria-busy="true"
        aria-label="Loading admin panel"
      >
        <div className="hidden border-r bg-sidebar p-4 md:block">
          <Skeleton className="h-6 w-28" />
          <div className="mt-8 grid gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-full" />
            ))}
          </div>
        </div>
        <div className="p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto border-r bg-sidebar px-3 py-4 md:flex">
        <div>
          <div className="flex items-center gap-2 px-2.5 pb-6">
            <Logo href={ROUTES.adminDashboard} />
            <span className="rounded-sm border border-line-strong px-1.5 py-px text-[0.625rem] font-medium text-ink-3">
              Admin
            </span>
          </div>
          <AdminNav />
        </div>
        <AdminIdentity />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/95 px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-72 flex-col justify-between overflow-y-auto bg-sidebar px-3 py-4"
            >
              <div>
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Admin navigation
                </SheetDescription>
                <div className="px-2.5 pb-6">
                  <Logo href={ROUTES.adminDashboard} />
                </div>
                <AdminNav onNavigate={() => setOpen(false)} />
              </div>
              <AdminIdentity />
            </SheetContent>
          </Sheet>
          <Logo href={ROUTES.adminDashboard} />
          <span className="t-caption ml-auto">Admin</span>
        </header>

        <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
