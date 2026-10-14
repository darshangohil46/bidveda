import { describe, expect, it } from "vitest";
import { PermissionAction, toUserRole, UserRole } from "@/types/enums";

describe("enums", () => {
  it("narrows an untrusted string to a role, whatever its case", () => {
    expect(toUserRole("vendor")).toBe(UserRole.VENDOR);
    expect(toUserRole("BUYER")).toBe(UserRole.BUYER);
    expect(toUserRole("admin")).toBeNull();
    expect(toUserRole(undefined)).toBeNull();
  });

  it("keeps permission actions in create, read, update, delete order (the matrix columns follow it)", () => {
    expect(Object.values(PermissionAction)).toEqual([
      "create",
      "read",
      "update",
      "delete",
    ]);
  });
});
