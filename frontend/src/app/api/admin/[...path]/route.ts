import type { NextRequest } from "next/server";
import { adminProxyApi } from "@/services-api/proxy.api";

type Context = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: Context) {
  return adminProxyApi.forward(req, (await params).path);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
