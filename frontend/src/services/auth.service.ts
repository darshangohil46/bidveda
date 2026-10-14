import { clientApi } from "@/lib/clientApi";
import type {
  LoginPayload,
  PublicUser,
  SignupPayload,
  UserSession,
} from "@/types/auth";

/** Buyer / vendor sign-in. Talks to /api/auth/* (Next.js routes), never to the backend directly. */
export class AuthService {
  async login(payload: LoginPayload): Promise<UserSession> {
    const session = await clientApi.post<UserSession>("/auth/login", payload, {
      skipRefresh: true,
    });
    clientApi.setAccessToken(session.accessToken);
    return session;
  }

  async signup(payload: SignupPayload): Promise<UserSession> {
    const session = await clientApi.post<UserSession>("/auth/signup", payload, {
      skipRefresh: true,
    });
    clientApi.setAccessToken(session.accessToken);
    return session;
  }

  /** Restores the session after a page load, using the HttpOnly refresh cookie. */
  refresh(): Promise<UserSession | null> {
    return clientApi.refreshSession<UserSession>();
  }

  async logout(): Promise<void> {
    try {
      await clientApi.post<void>("/auth/logout", undefined, {
        skipRefresh: true,
      });
    } finally {
      clientApi.setAccessToken(null);
    }
  }

  me(): Promise<PublicUser> {
    return clientApi.get<PublicUser>("/auth/me");
  }
}

export const authService = new AuthService();
