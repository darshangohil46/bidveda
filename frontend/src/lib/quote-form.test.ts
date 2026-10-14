import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  hasQuoteErrors,
  toQuotePayload,
  validateQuoteForm,
  type QuoteFormValues,
} from "@/lib/quote-form";
import type { LineItem } from "@/types/rfq";

const lines: LineItem[] = [
  { id: "a", position: 1, name: "Chair", quantity: 10, unit: "pcs" },
  { id: "b", position: 2, name: "Desk", quantity: 2.5, unit: "pcs" },
];

const form = (overrides: Partial<QuoteFormValues> = {}): QuoteFormValues => ({
  prices: { a: "100", b: "200.50" },
  deliveryDays: "14",
  notes: "",
  ...overrides,
});

describe("calculateTotals", () => {
  it("works out each line and the total in minor units", () => {
    const { lineTotals, total } = calculateTotals(lines, form().prices);
    expect(lineTotals).toEqual([100_000, 50_125]);
    expect(total).toBe(150_125);
  });

  it("has no total until every line is priced", () => {
    const { lineTotals, total } = calculateTotals(lines, { a: "100", b: "" });
    expect(lineTotals).toEqual([100_000, null]);
    expect(total).toBeNull();
  });
});

describe("validateQuoteForm", () => {
  it("accepts a fully priced quote with a delivery time", () => {
    expect(hasQuoteErrors(validateQuoteForm(form(), lines))).toBe(false);
  });

  it("points at the line that has no price", () => {
    const errors = validateQuoteForm(
      form({ prices: { a: "100", b: "" } }),
      lines,
    );
    expect(errors.prices.a).toBeUndefined();
    expect(errors.prices.b).toBe("Enter a price greater than zero.");
  });

  it("rejects a zero price and a missing price entry", () => {
    expect(
      validateQuoteForm(form({ prices: { a: "0", b: "5" } }), lines).prices.a,
    ).toBeDefined();
    expect(
      validateQuoteForm(form({ prices: { b: "5" } }), lines).prices.a,
    ).toBeDefined();
  });

  it("wants delivery in whole days from 1 to 3650", () => {
    for (const bad of ["", "0", "3651", "2.5"]) {
      expect(
        validateQuoteForm(form({ deliveryDays: bad }), lines).delivery,
      ).toBeDefined();
    }
    expect(
      validateQuoteForm(form({ deliveryDays: "3650" }), lines).delivery,
    ).toBeUndefined();
  });
});

describe("toQuotePayload", () => {
  it("sends unit prices in minor units, the delivery days and trimmed notes", () => {
    const payload = toQuotePayload(form({ notes: "  Net 30  " }), lines);
    expect(payload.items).toEqual([
      { lineItemId: "a", unitPriceMinor: 10_000 },
      { lineItemId: "b", unitPriceMinor: 20_050 },
    ]);
    expect(payload.deliveryDays).toBe(14);
    expect(payload.notes).toBe("Net 30");
  });

  it("leaves notes out when they are empty", () => {
    expect(toQuotePayload(form({ notes: "   " }), lines).notes).toBeUndefined();
  });
});
