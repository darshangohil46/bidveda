import { describe, expect, it } from "vitest";
import { buildPayload, initialValues, splitFields } from "@/lib/resource-form";
import { nextAdminSort } from "@/lib/admin-sort";
import type { FieldMeta, ResourceMeta } from "@/types/admin";
import { FieldType, FormMode, SortOrder } from "@/types/enums";

const field = (
  name: string,
  type: FieldType,
  extra: Partial<FieldMeta> = {},
): FieldMeta => ({ name, label: name, type, ...extra });

const meta: ResourceMeta = {
  key: "admins",
  label: "Admin",
  labelPlural: "Admins",
  icon: "UserCog",
  group: "Access control",
  groupIcon: "ShieldCheck",
  labelField: "name",
  capabilities: { create: true, update: true, delete: true },
  fields: [
    field("id", FieldType.STRING, { readonly: true }),
    field("name", FieldType.STRING),
    field("role", FieldType.FK, { immutable: true }),
    field("password", FieldType.PASSWORD, { secret: true }),
    field("isActive", FieldType.BOOLEAN, { defaultValue: true }),
    field("createdAt", FieldType.DATETIME, { readonly: true }),
  ],
};

describe("splitFields", () => {
  it("lets every input be filled when creating, and shows read-only values (never the id) separately", () => {
    const { editable, shown } = splitFields(meta, FormMode.CREATE);
    expect(editable.map((f) => f.name)).toEqual([
      "name",
      "role",
      "password",
      "isActive",
    ]);
    expect(shown.map((f) => f.name)).toEqual(["createdAt"]);
  });

  it("locks immutable fields once the record exists", () => {
    expect(
      splitFields(meta, FormMode.EDIT).editable.map((f) => f.name),
    ).not.toContain("role");
  });
});

describe("initialValues", () => {
  it("uses the saved value, then the default, then an empty one", () => {
    const create = initialValues(meta, null);
    expect(create).toMatchObject({ name: "", isActive: true, password: "" });

    const edit = initialValues(meta, {
      id: "1",
      name: "Asha",
      isActive: false,
    });
    expect(edit).toMatchObject({ name: "Asha", isActive: false });
  });
});

describe("buildPayload", () => {
  it("sends a foreign key as its id and skips an empty password", () => {
    const { editable } = splitFields(meta, FormMode.CREATE);
    const payload = buildPayload(editable, {
      name: "Asha",
      role: { id: "r1", label: "Editor" },
      password: "",
      isActive: true,
    });
    expect(payload).toEqual({ name: "Asha", role: "r1", isActive: true });
  });

  it("sends a password when one was typed", () => {
    const { editable } = splitFields(meta, FormMode.CREATE);
    expect(
      buildPayload(editable, {
        name: "A",
        role: null,
        password: "Sup3rSecret",
        isActive: true,
      }),
    ).toMatchObject({
      password: "Sup3rSecret",
      role: null,
    });
  });
});

describe("nextAdminSort", () => {
  it("goes ascending, then descending, then back to the default", () => {
    const first = nextAdminSort(null, "name");
    expect(first).toEqual({ by: "name", order: SortOrder.ASC });
    const second = nextAdminSort(first, "name");
    expect(second).toEqual({ by: "name", order: SortOrder.DESC });
    expect(nextAdminSort(second, "name")).toBeNull();
  });

  it("starts again at ascending when another column is clicked", () => {
    expect(
      nextAdminSort({ by: "name", order: SortOrder.DESC }, "email"),
    ).toEqual({ by: "email", order: SortOrder.ASC });
  });
});
