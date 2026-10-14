import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/baseApi";
import { ClientApi } from "@/lib/clientApi";

type Call = { url: string; init: RequestInit };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Scripts the answers fetch gives, and records what was sent. */
function mockFetch(answer: (call: Call) => Response) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const call = { url, init };
      calls.push(call);
      return answer(call);
    }),
  );
  return calls;
}

const authHeader = (call: Call) =>
  new Headers(call.init.headers).get("authorization");

describe("ClientApi 401 interceptor", () => {
  let api: ClientApi;

  beforeEach(() => {
    api = new ClientApi("/api", { refreshPath: "/auth/refresh" });
    api.setAccessToken("old-token");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("refreshes once, then repeats the same request with the same payload and the new token", async () => {
    const calls = mockFetch((call) => {
      if (call.url === "/api/auth/refresh")
        return json({ accessToken: "new-token" });
      return authHeader(call) === "Bearer new-token"
        ? json({ ok: true })
        : json({ code: "TOKEN_EXPIRED", message: "expired" }, 401);
    });

    const result = await api.post<{ ok: boolean }>("/rfqs", {
      title: "Chairs",
    });

    expect(result).toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/rfqs",
      "/api/auth/refresh",
      "/api/rfqs",
    ]);
    expect(calls[0].init.body).toBe('{"title":"Chairs"}');
    expect(calls[2].init.body).toBe('{"title":"Chairs"}'); // payload replayed untouched
    expect(authHeader(calls[0])).toBe("Bearer old-token");
    expect(authHeader(calls[2])).toBe("Bearer new-token");
    expect(api.getAccessToken()).toBe("new-token");
  });

  it("shares one refresh between simultaneous failing requests", async () => {
    const calls = mockFetch((call) => {
      if (call.url === "/api/auth/refresh")
        return json({ accessToken: "new-token" });
      return authHeader(call) === "Bearer new-token"
        ? json({ ok: true })
        : json({ message: "expired" }, 401);
    });

    await Promise.all([
      api.get("/rfqs"),
      api.get("/quotes/mine"),
      api.get("/rfqs/1"),
    ]);

    expect(
      calls.filter((call) => call.url === "/api/auth/refresh"),
    ).toHaveLength(1);
  });

  it("signs the person out when the refresh token is dead too", async () => {
    mockFetch((call) =>
      call.url === "/api/auth/refresh"
        ? json({ message: "gone" }, 401)
        : json({ message: "expired" }, 401),
    );
    const expired = vi.fn();
    api.setSessionExpiredHandler(expired);

    await expect(api.get("/rfqs")).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(api.getAccessToken()).toBeNull();
  });

  it("does not try to refresh when the call opts out (login, logout)", async () => {
    const calls = mockFetch(() =>
      json(
        {
          code: "INVALID_CREDENTIALS",
          message: "Incorrect email or password.",
        },
        401,
      ),
    );

    await expect(
      api.post("/auth/login", { email: "a@b.c" }, { skipRefresh: true }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
    expect(calls).toHaveLength(1);
  });

  it("replays multipart uploads after a refresh", async () => {
    const calls = mockFetch((call) => {
      if (call.url === "/api/auth/refresh")
        return json({ accessToken: "new-token" });
      return authHeader(call) === "Bearer new-token"
        ? json({ id: "file-1" }, 201)
        : json({ message: "expired" }, 401);
    });
    const form = new FormData();
    form.append("file", new Blob(["%PDF-1.4"]), "spec.pdf");

    const result = await api.post<{ id: string }>("/rfqs/1/attachments", form);

    expect(result.id).toBe("file-1");
    expect(calls[2].init.body).toBe(form);
  });

  it("turns API error bodies into ApiError with a code and field details", async () => {
    mockFetch(() =>
      json(
        {
          statusCode: 409,
          code: "DEADLINE_PASSED",
          message: "The submission deadline has passed.",
        },
        409,
      ),
    );
    const error = await api
      .put("/rfqs/1/my-quote", {})
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "DEADLINE_PASSED" });
  });
});
