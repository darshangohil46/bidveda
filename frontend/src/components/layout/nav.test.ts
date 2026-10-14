import { describe, expect, it } from "vitest";
import { NAV_BY_ROLE } from "@/components/layout/nav";
import { UserRole } from "@/types/enums";

describe("the top bar links", () => {
  it("gives a vendor two pages and marks the one they are on", () => {
    const [open, mine] = NAV_BY_ROLE[UserRole.VENDOR];
    expect([open.label, mine.label]).toEqual(["Open RFQs", "My quotes"]);
    expect(open.isActive("/vendor/rfqs/123")).toBe(true);
    expect(open.isActive("/vendor/quotes")).toBe(false);
    expect(mine.isActive("/vendor/quotes")).toBe(true);
  });

  it("keeps a buyer on their own pages only", () => {
    const links = NAV_BY_ROLE[UserRole.BUYER];
    expect(links.map((link) => link.href)).toEqual(["/buyer/rfqs"]);
    expect(links[0].isActive("/buyer/rfqs/123/compare")).toBe(true);
    expect(links[0].isActive("/vendor/rfqs")).toBe(false);
  });
});
