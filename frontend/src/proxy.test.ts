import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const visit = (path: string, cookie?: string) =>
  proxy(
    new NextRequest(`http://localhost:3000${path}`, {
      headers: cookie ? { cookie } : {},
    }),
  );
const where = (response: Response) =>
  new URL(response.headers.get("location") ?? "http://none").pathname;

describe("the entry address (/ is not a page)", () => {
  it("leads a signed-out visitor to sign-in", () => {
    const response = visit("/");
    expect(response.status).toBe(307);
    expect(where(response)).toBe("/login");
  });

  it("leads a signed-in buyer or vendor to their own pages", () => {
    expect(where(visit("/", "bv_refresh=x; bv_role=BUYER"))).toBe(
      "/buyer/rfqs",
    );
    expect(where(visit("/", "bv_refresh=x; bv_role=VENDOR"))).toBe(
      "/vendor/rfqs",
    );
  });

  it("falls back to the buyer home when the role hint is missing or junk (RoleGate corrects it on arrival)", () => {
    expect(where(visit("/", "bv_refresh=x"))).toBe("/buyer/rfqs");
    expect(where(visit("/", "bv_refresh=x; bv_role=admin"))).toBe(
      "/buyer/rfqs",
    );
  });

  it("ignores a role hint when nobody is signed in", () => {
    expect(where(visit("/", "bv_role=VENDOR"))).toBe("/login");
  });
});

describe("sign-in and the role pages", () => {
  it("sends someone who is already signed in away from the login and signup pages", () => {
    expect(where(visit("/login", "bv_refresh=x; bv_role=VENDOR"))).toBe(
      "/vendor/rfqs",
    );
    expect(where(visit("/signup", "bv_refresh=x; bv_role=BUYER"))).toBe(
      "/buyer/rfqs",
    );
  });

  it("lets a signed-out visitor see login and signup", () => {
    expect(visit("/login").headers.get("location")).toBeNull();
    expect(visit("/signup").headers.get("location")).toBeNull();
  });

  it("keeps the wanted page in ?next= when a signed-out visitor opens a buyer or vendor page", () => {
    const response = visit("/vendor/rfqs/123");
    expect(where(response)).toBe("/login");
    expect(
      new URL(response.headers.get("location") ?? "").searchParams.get("next"),
    ).toBe("/vendor/rfqs/123");
  });
});
