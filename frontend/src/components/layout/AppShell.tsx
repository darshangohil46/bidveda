"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/common/Logo";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { TopNav } from "@/components/layout/TopNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthStatus } from "@/types/enums";
import { roleHome } from "@/utils/constant";

const BAR =
  "mx-auto flex w-full max-w-[72rem] items-center px-4 sm:px-6 lg:px-10";
const PAGE = "mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-9";

function ShellSkeleton() {
  return (
    <div
      className="min-h-dvh"
      aria-busy="true"
      aria-label="Loading your workspace"
    >
      <div className="border-b">
        <div className={`${BAR} h-14`}>
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      <div className={PAGE}>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}

/**
 * The frame around every signed-in page: a bar on top (logo, the links of the person's role, and
 * their account menu) and the page below it. Waits for the session to be restored first, so
 * nothing personal is shown before it is known who is signed in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();

  if (status !== AuthStatus.AUTHENTICATED || !user) return <ShellSkeleton />;
  const items = NAV_BY_ROLE[user.role];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className={`${BAR} h-14 gap-3 sm:gap-6`}>
          <Logo href={roleHome(user.role)} />
          {items.length > 1 && <TopNav items={items} />}
          <div className="ml-auto shrink-0">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className={PAGE}>{children}</main>
    </div>
  );
}
