import type {
  ApiErrorBody,
  ApiRequestOptions,
  BodylessOptions,
  HttpMethod,
  QueryParams,
} from "@/types/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromPayload(status: number, payload: unknown): ApiError {
    const body = (payload ?? {}) as Partial<ApiErrorBody>;
    const message = Array.isArray(body.message)
      ? body.message.join(" ")
      : (body.message ?? "Something went wrong. Please try again.");
    return new ApiError(status, body.code ?? "ERROR", message, body.details);
  }

  /** Field-level messages from the admin API: { fields: { email: "..." } } */
  get fieldErrors(): Record<string, string> {
    const details = this.details as
      | { fields?: Record<string, string> }
      | undefined;
    return details?.fields ?? {};
  }
}

/**
 * Single place that knows how to talk HTTP with fetch. ClientApi (browser -> Next.js routes)
 * and ServerApi (Next.js routes -> NestJS) extend it and only override `execute`.
 */
export abstract class BaseApi {
  constructor(protected readonly baseUrl: string) {}

  get<T>(path: string, options: BodylessOptions = {}): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  post<T>(
    path: string,
    body?: unknown,
    options: BodylessOptions = {},
  ): Promise<T> {
    return this.request<T>("POST", path, { ...options, body });
  }

  put<T>(
    path: string,
    body?: unknown,
    options: BodylessOptions = {},
  ): Promise<T> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options: BodylessOptions = {},
  ): Promise<T> {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  delete<T>(path: string, options: BodylessOptions = {}): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const response = await this.raw(method, path, options);
    return this.parse<T>(response);
  }

  /** The untouched Response. Used by the proxy (pass-through) and by file downloads. */
  raw(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<Response> {
    return this.execute(
      this.buildUrl(path, options.query),
      this.buildInit(method, options),
      options,
    );
  }

  async download(
    path: string,
    options: BodylessOptions = {},
  ): Promise<{ blob: Blob; filename: string | null }> {
    const response = await this.raw("GET", path, options);
    if (!response.ok) await this.parse(response);
    const disposition = response.headers.get("content-disposition") ?? "";
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
    return {
      blob: await response.blob(),
      filename: encoded ? decodeURIComponent(encoded) : (plain ?? null),
    };
  }

  protected execute(
    url: string,
    init: RequestInit,
    options: ApiRequestOptions,
  ): Promise<Response> {
    return fetch(url, { ...init, signal: init.signal ?? options.signal });
  }

  protected buildUrl(path: string, query?: QueryParams): string {
    const base = this.baseUrl.replace(/\/$/, "");
    const clean = path.startsWith("/") ? path : `/${path}`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== "")
        params.append(key, String(value));
    }
    const qs = params.toString();
    if (!qs) return `${base}${clean}`;
    return `${base}${clean}${clean.includes("?") ? "&" : "?"}${qs}`;
  }

  protected buildInit(
    method: HttpMethod,
    options: ApiRequestOptions,
  ): RequestInit {
    const headers = new Headers(options.headers);
    let body: BodyInit | undefined;

    if (options.body !== undefined && options.body !== null) {
      if (
        options.body instanceof FormData ||
        typeof options.body === "string"
      ) {
        body = options.body;
      } else {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(options.body);
      }
    }
    return { method, headers, body, signal: options.signal, cache: "no-store" };
  }

  protected async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;

    const isJson = (response.headers.get("content-type") ?? "").includes(
      "application/json",
    );
    const payload: unknown = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      throw ApiError.fromPayload(
        response.status,
        isJson ? payload : { message: payload },
      );
    }
    return payload as T;
  }
}
