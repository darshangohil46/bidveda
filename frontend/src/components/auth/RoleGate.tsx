"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/types/enums";
import { roleHome } from "@/utils/constant";

/** Shows its children only to one role. Anyone else is sent to the pages that belong to them. */
export function RoleGate({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const allowed = user?.role === role;

  useEffect(() => {
    if (user && !allowed) router.replace(roleHome(user.role));
  }, [user, allowed, router]);

  if (!allowed) return <Skeleton aria-busy="true" className="h-40 w-full" />;
  return <>{children}</>;
}
