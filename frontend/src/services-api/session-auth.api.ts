import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/baseApi";
import { serverApi } from "@/lib/serverApi";
import { errorResponse, forwardedHeaders, readJson } from "@/services-api/http";
import type { SessionAuthConfig, UpstreamSession } from "@/types/api";
import { COOKIE_NAMES, REFRESH_COOKIE_MAX_AGE_SECONDS } from "@/utils/constant";

const COOKIE_SECURE = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith(
  "https://",
);

/**
 * Sign-in, refresh and sign-out for one realm.
 *
 * The backend returns the refresh token in the response body; this class moves it into an
 * HttpOnly cookie and strips it from what the browser receives, so page JavaScript can
 * never read it. The access token goes back in the body and lives in memory only.
 */
export class SessionAuthApi {
  constructor(private readonly config: SessionAuthConfig) {}

  login(req: NextRequest): Promise<NextResponse> {
    return this.startSession(req, `${this.config.basePath}/login`);
  }

  signup(req: NextRequest): Promise<NextResponse> {
    return this.startSession(req, `${this.config.basePath}/signup`);
  }

  async refresh(req: NextRequest): Promise<NextResponse> {
    const refreshToken = req.cookies.get(this.config.cookieName)?.value;
    if (!refreshToken) {
      return errorResponse(
        new ApiError(401, "NO_REFRESH_TOKEN", "You are signed out."),
      );
    }

    try {
      const session = await serverApi.post<Record<string, unknown>>(
        `${this.config.basePath}/refresh`,
        { refreshToken },
        { headers: forwardedHeaders(req), skipRefresh: true },
      );
      const response = NextResponse.json(session);
      this.setRoleCookie(response, session);
      return response;
    } catch (error) {
      const response = errorResponse(error);
      // A rejected refresh token is dead for good; drop the cookie so the proxy stops trusting it.
      if (error instanceof ApiError && error.status === 401)
        this.clearCookie(response);
      return response;
    }
  }

  async logout(req: NextRequest): Promise<NextResponse> {
    const refreshToken = req.cookies.get(this.config.cookieName)?.value;
    if (refreshToken) {
      try {
        await serverApi.post(
          `${this.config.basePath}/logout`,
          { refreshToken },
          { skipRefresh: true },
        );
      } catch {
        // The cookie is cleared either way; a failed revoke only means the session expires on its own.
      }
    }
    const response = new NextResponse(null, { status: 204 });
    this.clearCookie(response);
    return response;
  }

  private async startSession(
    req: NextRequest,
    backendPath: string,
  ): Promise<NextResponse> {
    try {
      const payload = await readJson(req);
      const { refreshToken, ...session } =
        await serverApi.post<UpstreamSession>(backendPath, payload, {
          headers: forwardedHeaders(req),
          skipRefresh: true,
        });
      const response = NextResponse.json(session, {
        status: backendPath.endsWith("/signup") ? 201 : 200,
      });
      response.cookies.set({
        name: this.config.cookieName,
        value: refreshToken,
        httpOnly: true,
        sameSite: "lax",
        secure: COOKIE_SECURE,
        path: "/",
        maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
      });
      this.setRoleCookie(response, session);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  }

  /** Remembers the role next to the session so the proxy can route "/" without asking the API. */
  private setRoleCookie(
    response: NextResponse,
    session: Record<string, unknown>,
  ): void {
    const role = (session.user as { role?: unknown } | undefined)?.role;
    if (!this.config.roleCookieName || typeof role !== "string") return;
    response.cookies.set({
      name: this.config.roleCookieName,
      value: role,
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }

  private clearCookie(response: NextResponse): void {
    for (const name of [this.config.cookieName, this.config.roleCookieName]) {
      if (!name) continue;
      response.cookies.set({
        name,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: COOKIE_SECURE,
        path: "/",
        maxAge: 0,
      });
    }
  }
}

export const userAuthApi = new SessionAuthApi({
  cookieName: COOKIE_NAMES.userRefresh,
  roleCookieName: COOKIE_NAMES.userRole,
  basePath: "/auth",
});

export const adminAuthApi = new SessionAuthApi({
  cookieName: COOKIE_NAMES.adminRefresh,
  basePath: "/auth/admin",
});
