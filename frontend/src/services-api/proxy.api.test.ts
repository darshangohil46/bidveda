import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminProxyApi, userProxyApi } from "@/services-api/proxy.api";
import { jsonResponse, stubFetch } from "@/tests/fetch-stub";

const request = (
  path: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
) => new NextRequest(`http://localhost:3000${path}`, init);

afterEach(() => vi.unstubAllGlobals());

describe("buyer and vendor proxy", () => {
  it("forwards the caller's token and relays status, body and file headers", async () => {
    const calls = stubFetch(
      () =>
        new Response("PDFBYTES", {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'attachment; filename="spec.pdf"',
            "set-cookie": "leak=1",
          },
        }),
    );

    const response = await userProxyApi.forward(
      request("/api/attachments/abc/download?x=1", {
        headers: { authorization: "Bearer t0k3n", "user-agent": "vitest" },
      }),
      ["attachments", "abc", "download"],
    );

    expect(calls[0].url).toBe(
      "http://localhost:5000/api/attachments/abc/download?x=1",
    );
    expect(calls[0].headers.get("authorization")).toBe("Bearer t0k3n");
    expect(calls[0].headers.get("user-agent")).toBe("vitest");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("PDFBYTES");
    expect(response.headers.get("content-disposition")).toContain("spec.pdf");
    expect(response.headers.get("set-cookie")).toBeNull(); // only an allow-list of headers is relayed
  });

  it("passes JSON bodies and the backend's error answers through untouched", async () => {
    const calls = stubFetch(() =>
      jsonResponse(
        { statusCode: 409, code: "DEADLINE_PASSED", message: "late" },
        409,
      ),
    );

    const response = await userProxyApi.forward(
      request("/api/rfqs/1/my-quote", {
        method: "PUT",
        body: JSON.stringify({ deliveryDays: 5 }),
        headers: { "content-type": "application/json" },
      }),
      ["rfqs", "1", "my-quote"],
    );

    expect(calls[0].method).toBe("PUT");
    expect(calls[0].body).toBe('{"deliveryDays":5}');
    expect(calls[0].headers.get("content-type")).toBe("application/json");
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "DEADLINE_PASSED" });
  });

  it("forwards multipart uploads as form data", async () => {
    const calls = stubFetch(() => jsonResponse({ id: "file-1" }, 201));
    const form = new FormData();
    form.append(
      "file",
      new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      "spec.pdf",
    );

    const response = await userProxyApi.forward(
      request("/api/rfqs/1/attachments", { method: "POST", body: form }),
      ["rfqs", "1", "attachments"],
    );

    expect(response.status).toBe(201);
    expect(calls[0].body).toBeInstanceOf(FormData);
    expect((calls[0].body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("refuses path traversal, unknown roots and admin sign-in routes", async () => {
    const calls = stubFetch(() => jsonResponse({}));
    for (const segments of [
      ["rfqs", "..", "admin"],
      ["health"],
      ["auth", "admin", "login"],
      ["rfqs", "a/b"],
      [],
    ]) {
      const response = await userProxyApi.forward(request("/api/x"), segments);
      expect(response.status).toBe(404);
    }
    expect(calls).toHaveLength(0);
  });

  it("answers 502 instead of crashing when the backend is down", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const response = await userProxyApi.forward(request("/api/rfqs"), ["rfqs"]);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      code: "BACKEND_UNREACHABLE",
    });
  });
});

describe("admin proxy", () => {
  it("prefixes every path with /admin", async () => {
    const calls = stubFetch(() => jsonResponse([]));
    await adminProxyApi.forward(request("/api/admin/resources"), ["resources"]);
    expect(calls[0].url).toBe("http://localhost:5000/api/admin/resources");
  });
});
