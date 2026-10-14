import type { NextRequest } from "next/server";
import { userAuthApi } from "@/services-api/session-auth.api";

export function POST(req: NextRequest) {
  return userAuthApi.signup(req);
}
