import "server-only";
import { ApiError, BaseApi } from "@/lib/baseApi";

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Next.js route handlers -> NestJS API. Server only: the backend URL never reaches the browser.
 * A dead or slow backend becomes a clean 502/504 ApiError instead of a hung request.
 */
export class ServerApi extends BaseApi {
  protected override async execute(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut =
        error instanceof DOMException && error.name === "TimeoutError";
      throw new ApiError(
        timedOut ? 504 : 502,
        timedOut ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE",
        timedOut
          ? "The server took too long to respond."
          : "The server is not reachable right now.",
      );
    }
  }
}

export const serverApi = new ServerApi(
  process.env.BACKEND_API_URL ?? "http://localhost:5000/api",
);
