import { vi } from "vitest";

export interface RecordedCall {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

/**
 * Replaces global fetch with a plain function (not a vi.fn, so failures it throws stay ordinary
 * rejections). The handler returns the Response to give back, or throws to simulate a network error.
 */
export function stubFetch(
  handler: (call: RecordedCall) => Response | Promise<Response>,
): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit = {}) => {
    const call: RecordedCall = {
      url: String(url),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: init.body,
    };
    calls.push(call);
    return handler(call);
  });
  return calls;
}

export const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
