/** Error shape returned by the NestJS API and by our route handlers. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export type PageQuery = {
  page?: number;
  limit?: number;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  query?: QueryParams;
  /** A plain object is sent as JSON; FormData and strings are sent as they are. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip the refresh-and-retry on 401 (login, refresh and logout must not loop). */
  skipRefresh?: boolean;
}

export type BodylessOptions = Omit<ApiRequestOptions, "body">;

export interface ClientApiConfig {
  /** Next.js route that exchanges the HttpOnly refresh cookie for a new access token. */
  refreshPath: string;
}

/** Server-side: one signed-in realm (buyer/vendor or admin). */
export interface SessionAuthConfig {
  /** HttpOnly cookie that holds this realm's refresh token. */
  cookieName: string;
  /** Optional cookie that remembers the signed-in user's role, set and cleared together with the session. */
  roleCookieName?: string;
  /** Backend path prefix: /auth for buyers and vendors, /auth/admin for admins. */
  basePath: string;
}

/** What the backend returns on sign-in: the browser only ever gets the part without the refresh token. */
export interface UpstreamSession {
  accessToken: string;
  refreshToken: string;
  [profile: string]: unknown;
}

export interface ProxyConfig {
  /** First path segment allowed through (empty set = anything under `prefix`). */
  allowedRoots: ReadonlySet<string>;
  /** Backend path prefix added in front, e.g. "admin". */
  prefix?: string;
  /** Path starts that are refused even if the root is allowed. */
  blockedStarts?: readonly string[];
}

export interface QueryResult<T> {
  requestKey: string;
  data: T | null;
  error: Error | null;
}
