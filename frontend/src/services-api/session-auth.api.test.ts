import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userAuthApi, adminAuthApi } from "@/services-api/session-auth.api";
import { jsonResponse, stubFetch } from "@/tests/fetch-stub";
import { COOKIE_NAMES } from "@/utils/constant";

const withBody = (path: string, body: unknown, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
  });

afterEach(() => vi.unstubAllGlobals());

describe("sign-in", () => {
  it("moves the refresh token into an HttpOnly cookie and keeps it out of the response body", async () => {
    const calls = stubFetch(() =>
      jsonResponse({
        accessToken: "access",
        refreshToken: "REFRESH-SECRET",
        user: { id: "u1", role: "BUYER" },
      }),
    );

    const response = await userAuthApi.login(
      withBody("/api/auth/login", { email: "a@b.c", password: "x" }),
    );

    expect(calls[0].url).toBe("http://localhost:5000/api/auth/login");
    const body = await response.json();
    expect(body).toEqual({
      accessToken: "access",
      user: { id: "u1", role: "BUYER" },
    });
    expect(JSON.stringify(body)).not.toContain("REFRESH-SECRET");

    expect(response.cookies.get(COOKIE_NAMES.userRefresh)?.value).toBe(
      "REFRESH-SECRET",
    );
    // Only a routing hint for the proxy; the API still decides what the role may do.
    expect(response.cookies.get(COOKIE_NAMES.userRole)?.value).toBe("BUYER");
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(response.headers.get("set-cookie")).toMatch(/SameSite=lax/i);
  });

  it("keeps admin and user sessions in different cookies and on different backend routes", async () => {
    const calls = stubFetch(() =>
      jsonResponse({
        accessToken: "a",
        refreshToken: "r",
        admin: { id: "a1" },
      }),
    );
    const response = await adminAuthApi.login(
      withBody("/api/auth/admin/login", { email: "x@y.z", password: "p" }),
    );
    expect(calls[0].url).toBe("http://localhost:5000/api/auth/admin/login");
    expect(response.cookies.get(COOKIE_NAMES.adminRefresh)?.value).toBe("r");
    expect(response.cookies.get(COOKIE_NAMES.userRefresh)).toBeUndefined();
    expect(response.cookies.get(COOKIE_NAMES.userRole)).toBeUndefined();
  });

  it("returns the backend's error and sets no cookie when credentials are wrong", async () => {
    stubFetch(() =>
      jsonResponse(
        {
          statusCode: 401,
          code: "INVALID_CREDENTIALS",
          message: "Incorrect email or password.",
        },
        401,
      ),
    );
    const response = await userAuthApi.login(
      withBody("/api/auth/login", { email: "a@b.c", password: "bad" }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(response.cookies.get(COOKIE_NAMES.userRefresh)).toBeUndefined();
  });

  it("answers 502 when the backend is unreachable", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const response = await userAuthApi.login(
      withBody("/api/auth/login", { email: "a@b.c", password: "x" }),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: "BACKEND_UNREACHABLE",
    });
  });
});

describe("refresh and sign-out", () => {
  it("answers 401 without calling the backend when there is no cookie", async () => {
    const calls = stubFetch(() => jsonResponse({}));
    const response = await userAuthApi.refresh(
      withBody("/api/auth/refresh", {}),
    );
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("sends the cookie's token to the backend and returns only the new access token data", async () => {
    const calls = stubFetch(() =>
      jsonResponse({
        accessToken: "fresh",
        user: { id: "u1", role: "VENDOR" },
      }),
    );
    const response = await userAuthApi.refresh(
      withBody(
        "/api/auth/refresh",
        {},
        `${COOKIE_NAMES.userRefresh}=cookie-token`,
      ),
    );
    expect(calls[0].url).toBe("http://localhost:5000/api/auth/refresh");
    expect(JSON.parse(calls[0].body as string)).toEqual({
      refreshToken: "cookie-token",
    });
    expect(await response.json()).toEqual({
      accessToken: "fresh",
      user: { id: "u1", role: "VENDOR" },
    });
    expect(response.cookies.get(COOKIE_NAMES.userRole)?.value).toBe("VENDOR");
  });

  it("clears the cookie when the backend says the refresh token is dead", async () => {
    stubFetch(() =>
      jsonResponse(
        { statusCode: 401, code: "REFRESH_INVALID", message: "expired" },
        401,
      ),
    );
    const response = await userAuthApi.refresh(
      withBody("/api/auth/refresh", {}, `${COOKIE_NAMES.userRefresh}=stale`),
    );
    expect(response.status).toBe(401);
    expect(response.cookies.get(COOKIE_NAMES.userRefresh)?.value).toBe("");
    expect(response.cookies.get(COOKIE_NAMES.userRole)?.value).toBe("");
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("clears the cookie on logout even if the backend call fails", async () => {
    const calls = stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const response = await userAuthApi.logout(
      withBody("/api/auth/logout", {}, `${COOKIE_NAMES.userRefresh}=token`),
    );
    expect(response.status).toBe(204);
    expect(response.cookies.get(COOKIE_NAMES.userRole)?.value).toBe("");
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
    expect(calls).toHaveLength(1);
  });
});
