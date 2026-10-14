import type { NextRequest } from "next/server";
import { adminAuthApi } from "@/services-api/session-auth.api";

export function POST(req: NextRequest) {
  return adminAuthApi.logout(req);
}
