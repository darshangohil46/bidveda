import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonDetails } from "@/components/admin/JsonDetails";

const html = (value: unknown) =>
  renderToStaticMarkup(createElement(JsonDetails, { value }));
const text = (value: unknown) =>
  html(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("JsonDetails", () => {
  it("shows every field of a deleted record, nothing cut short", () => {
    const out = text({
      deleted: {
        id: "13ea32fb-1afe-4ddb-93f9-e896ffd870f9",
        name: "zz tmp avatar role",
        isSystem: false,
        isActive: true,
        createdAt: "2026-10-14T06:00:26.000Z",
        description: null,
      },
    });
    expect(out).toContain("Deleted");
    expect(out).toContain("13ea32fb-1afe-4ddb-93f9-e896ffd870f9");
    expect(out).toContain("Is system No");
    expect(out).toContain("Is active Yes");
    expect(out).toContain("Created at");
    expect(out).toContain("Oct 2026");
    expect(out).not.toContain("…");
  });

  it("lists a role's permission flags on one line per resource", () => {
    const out = text({
      permissions: {
        admins: { create: true, read: true, update: false, delete: false },
      },
    });
    expect(out).toContain("Admins");
    expect(out).toContain("Create");
    expect(out).toContain("Delete");
  });

  it("accepts JSON that arrives as text, and plain arrays", () => {
    expect(text('{"phone":"+919876543210"}')).toContain("+919876543210");
    expect(text({ tags: ["a", "b"] })).toMatch(/Tags a\s*,\s*b/);
  });

  it("shows a dash for empty values", () => {
    expect(text({})).toBe("-");
    expect(text({ note: null })).toContain("Note -");
  });
});
