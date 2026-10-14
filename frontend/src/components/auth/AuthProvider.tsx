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
import { clientApi } from "@/lib/clientApi";
import { authService } from "@/services/auth.service";
import { AuthStatus } from "@/types/enums";
import type { AuthContextValue, AuthState, PublicUser } from "@/types/auth";
import { ROUTES } from "@/utils/constant";

const AuthContext = createContext<AuthContextValue | null>(null);

/** After a page load the access token is gone (memory only), so restore it from the cookie. */
async function restoreUser(): Promise<PublicUser | null> {
  if (clientApi.getAccessToken()) {
    try {
      return await authService.me();
    } catch {
      return null;
    }
  }
  const session = await authService.refresh();
  return session?.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    status: AuthStatus.LOADING,
    user: null,
  });

  useEffect(() => {
    let active = true;

    // Refresh token is dead too: clear the stale cookie, then go to sign-in.
    const endSession = () => {
      setState({ status: AuthStatus.UNAUTHENTICATED, user: null });
      void authService.logout().finally(() => router.replace(ROUTES.login));
    };

    clientApi.setSessionExpiredHandler(endSession);
    restoreUser().then((user) => {
      if (!active) return;
      if (user) setState({ status: AuthStatus.AUTHENTICATED, user });
      else endSession();
    });

    return () => {
      active = false;
      clientApi.setSessionExpiredHandler(null);
    };
  }, [router]);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ status: AuthStatus.UNAUTHENTICATED, user: null });
    router.replace(ROUTES.login);
  }, [router]);

  const value = useMemo(() => ({ ...state, logout }), [state, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** The signed-in user. Only call below a gate that has already waited for authentication. */
export function useUser(): PublicUser {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called before the session was ready");
  return user;
}
