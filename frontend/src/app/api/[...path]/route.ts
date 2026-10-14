import type { NextRequest } from "next/server";
import { userProxyApi } from "@/services-api/proxy.api";

type Context = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: Context) {
  return userProxyApi.forward(req, (await params).path);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
