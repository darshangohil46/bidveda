import { describe, expect, it } from "vitest";
import { customOptionFor, filterOptions, toOptions } from "@/lib/options";

const units = toOptions(["pcs", "box", "kg", "sq ft"]);

describe("toOptions", () => {
  it("uses each word as both the value and the label", () => {
    expect(toOptions(["pcs"])).toEqual([{ value: "pcs", label: "pcs" }]);
  });
});

describe("filterOptions", () => {
  it("matches any part of the label, ignoring case", () => {
    expect(filterOptions(units, "SQ", 10).map((o) => o.value)).toEqual([
      "sq ft",
    ]);
    expect(filterOptions(units, "c", 10).map((o) => o.value)).toEqual(["pcs"]);
  });

  it("shows everything when nothing is typed, up to the limit", () => {
    expect(filterOptions(units, "  ", 10)).toHaveLength(4);
    expect(filterOptions(units, "", 2)).toHaveLength(2);
  });
});

describe("customOptionFor", () => {
  it("offers what was typed when no option says the same", () => {
    expect(customOptionFor(units, "  bag ")).toEqual({
      value: "bag",
      label: "bag",
    });
  });

  it("offers nothing for an empty box or a word that is already an option", () => {
    expect(customOptionFor(units, "   ")).toBeNull();
    expect(customOptionFor(units, "KG")).toBeNull();
  });
});
