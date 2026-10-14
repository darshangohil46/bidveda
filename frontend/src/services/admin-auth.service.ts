import { adminClientApi } from "@/lib/clientApi";
import type { LoginPayload } from "@/types/auth";
import type { AdminProfile, AdminSession } from "@/types/admin";

/** Admin panel sign-in. Separate token, separate cookie, separate routes from buyers and vendors. */
export class AdminAuthService {
  async login(payload: LoginPayload): Promise<AdminSession> {
    const session = await adminClientApi.post<AdminSession>(
      "/auth/admin/login",
      payload,
      {
        skipRefresh: true,
      },
    );
    adminClientApi.setAccessToken(session.accessToken);
    return session;
  }

  refresh(): Promise<AdminSession | null> {
    return adminClientApi.refreshSession<AdminSession>();
  }

  async logout(): Promise<void> {
    try {
      await adminClientApi.post<void>("/auth/admin/logout", undefined, {
        skipRefresh: true,
      });
    } finally {
      adminClientApi.setAccessToken(null);
    }
  }

  me(): Promise<AdminProfile> {
    return adminClientApi.get<AdminProfile>("/admin/me");
  }
}

export const adminAuthService = new AdminAuthService();
