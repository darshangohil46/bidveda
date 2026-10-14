import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/baseApi";
import { serverApi } from "@/lib/serverApi";
import { errorResponse, forwardedHeaders } from "@/services-api/http";
import type { HttpMethod, ProxyConfig } from "@/types/api";

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Response headers that are safe and useful to hand back to the browser. */
const RELAYED_HEADERS = [
  "content-type",
  "content-disposition",
  "x-content-type-options",
  "cache-control",
];

/**
 * Forwards an authenticated API call to the backend and relays the answer untouched.
 * It adds no business logic: it only checks the path is one we expose, forwards the
 * caller's access token, and streams files through in both directions.
 */
export class ProxyApi {
  constructor(private readonly config: ProxyConfig) {}

  async forward(req: NextRequest, segments: string[]): Promise<NextResponse> {
    try {
      this.assertAllowed(segments);
      const path = `/${[...(this.config.prefix ? [this.config.prefix] : []), ...segments].join("/")}`;
      const { body, headers } = await this.readBody(req);

      const upstream = await serverApi.raw(
        req.method as HttpMethod,
        `${path}${req.nextUrl.search}`,
        {
          body,
          headers: { ...forwardedHeaders(req), ...headers },
          skipRefresh: true,
        },
      );
      return this.relay(upstream);
    } catch (error) {
      return errorResponse(error);
    }
  }

  private assertAllowed(segments: string[]): void {
    const valid =
      segments.length > 0 &&
      segments.every((segment) => SAFE_SEGMENT.test(segment));
    const rootAllowed =
      this.config.allowedRoots.size === 0 ||
      this.config.allowedRoots.has(segments[0]);
    const joined = segments.join("/");
    const blocked = (this.config.blockedStarts ?? []).some((start) =>
      joined.startsWith(start),
    );
    if (!valid || !rootAllowed || blocked) {
      throw new ApiError(404, "NOT_FOUND", "Not found");
    }
  }

  private async readBody(
    req: NextRequest,
  ): Promise<{ body?: string | FormData; headers: Record<string, string> }> {
    if (req.method === "GET" || req.method === "HEAD") return { headers: {} };

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // fetch sets the multipart boundary itself, so no content-type header is passed on.
      return { body: await req.formData(), headers: {} };
    }
    const text = await req.text();
    return text
      ? { body: text, headers: { "content-type": "application/json" } }
      : { headers: {} };
  }

  private relay(upstream: Response): NextResponse {
    const headers = new Headers();
    for (const name of RELAYED_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(upstream.status === 204 ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  }
}

/** Buyer / vendor API: rfqs, quotes, attachments and /auth/me-style calls. Admin sign-in has its own routes. */
export const userProxyApi = new ProxyApi({
  allowedRoots: new Set(["rfqs", "quotes", "attachments", "auth"]),
  blockedStarts: ["auth/admin", "auth/login", "auth/signup", "auth/refresh"],
});

/** Admin panel API: everything under /admin. */
export const adminProxyApi = new ProxyApi({
  allowedRoots: new Set(),
  prefix: "admin",
});
