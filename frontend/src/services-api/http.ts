import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/baseApi";

/** Headers worth passing on to the backend: who is asking, and from where. */
export function forwardedHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const authorization = req.headers.get("authorization");
  const userAgent = req.headers.get("user-agent");
  const forwardedFor =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");

  if (authorization) headers.authorization = authorization;
  if (userAgent) headers["user-agent"] = userAgent;
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
  return headers;
}

/** Same JSON error shape the NestJS API uses, so the browser handles both identically. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        statusCode: error.status,
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }
  return NextResponse.json(
    {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side.",
    },
    { status: 500 },
  );
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "The request body is not valid JSON.",
    );
  }
}
