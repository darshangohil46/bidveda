"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { adminClientApi } from "@/lib/clientApi";
import { adminAuthService } from "@/services/admin-auth.service";
import { adminService } from "@/services/admin.service";
import { AuthStatus, PermissionAction } from "@/types/enums";
import type {
  AdminContextValue,
  AdminProfile,
  AdminState,
} from "@/types/admin";
import { ROUTES } from "@/utils/constant";

const AdminContext = createContext<AdminContextValue | null>(null);

async function restoreAdmin(): Promise<AdminProfile | null> {
  if (adminClientApi.getAccessToken()) return adminAuthService.me();
  return (await adminAuthService.refresh())?.admin ?? null;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AdminState>({
    status: AuthStatus.LOADING,
    admin: null,
    resources: [],
  });

  useEffect(() => {
    let active = true;

    const endSession = () => {
      setState({
        status: AuthStatus.UNAUTHENTICATED,
        admin: null,
        resources: [],
      });
      void adminAuthService
        .logout()
        .finally(() => router.replace(ROUTES.adminLogin));
    };

    adminClientApi.setSessionExpiredHandler(endSession);
    (async () => {
      try {
        const admin = await restoreAdmin();
        if (!admin) throw new Error("No admin session");
        const resources = await adminService.resources();
        if (active)
          setState({ status: AuthStatus.AUTHENTICATED, admin, resources });
      } catch {
        if (active) endSession();
      }
    })();

    return () => {
      active = false;
      adminClientApi.setSessionExpiredHandler(null);
    };
  }, [router]);

  const can = useCallback(
    (resource: string, action: PermissionAction) =>
      state.admin?.permissions[resource]?.[action] === true,
    [state.admin],
  );

  const logout = useCallback(async () => {
    await adminAuthService.logout();
    setState({
      status: AuthStatus.UNAUTHENTICATED,
      admin: null,
      resources: [],
    });
    router.replace(ROUTES.adminLogin);
  }, [router]);

  const value = useMemo(
    () => ({ ...state, can, logout }),
    [state, can, logout],
  );
  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside <AdminProvider>");
  return context;
}
