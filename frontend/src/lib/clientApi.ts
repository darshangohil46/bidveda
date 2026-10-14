import { BaseApi } from "@/lib/baseApi";
import type { ApiRequestOptions, ClientApiConfig } from "@/types/api";

/**
 * Browser -> Next.js route handlers.
 *
 * Keeps the access token in memory only (never localStorage). When a request comes back
 * 401 it calls the refresh route once, then repeats the original request with the same
 * payload, so an expired access token is invisible to the person using the app.
 */
export class ClientApi extends BaseApi {
  private accessToken: string | null = null;
  private refreshInFlight: Promise<unknown> | null = null;
  private onSessionExpired: (() => void) | null = null;

  constructor(
    baseUrl: string,
    private readonly config: ClientApiConfig,
  ) {
    super(baseUrl);
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Called when the refresh token is also dead, so the app can send the person to sign in. */
  setSessionExpiredHandler(handler: (() => void) | null): void {
    this.onSessionExpired = handler;
  }

  /**
   * Gets a fresh access token from the refresh cookie. Concurrent callers share one request,
   * so five parallel 401s cause one refresh, not five.
   */
  refreshSession<T extends { accessToken: string }>(): Promise<T | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh<T>().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight as Promise<T | null>;
  }

  protected override async execute(
    url: string,
    init: RequestInit,
    options: ApiRequestOptions,
  ): Promise<Response> {
    const first = await this.send(url, init);
    if (first.status !== 401 || options.skipRefresh) return first;

    const session = await this.refreshSession();
    if (!session) {
      this.onSessionExpired?.();
      return first;
    }
    // Same URL, same payload, new token.
    return this.send(url, init);
  }

  private send(url: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.accessToken)
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    return fetch(url, { ...init, headers, credentials: "same-origin" });
  }

  private async performRefresh<
    T extends { accessToken: string },
  >(): Promise<T | null> {
    try {
      const response = await fetch(this.buildUrl(this.config.refreshPath), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      if (!response.ok) {
        this.accessToken = null;
        return null;
      }
      const session = (await response.json()) as T;
      this.accessToken = session.accessToken;
      return session;
    } catch {
      return null;
    }
  }
}

/** Buyer / vendor session. */
export const clientApi = new ClientApi("/api", {
  refreshPath: "/auth/refresh",
});

/** Admin panel session, kept completely separate from the buyer / vendor one. */
export const adminClientApi = new ClientApi("/api", {
  refreshPath: "/auth/admin/refresh",
});
