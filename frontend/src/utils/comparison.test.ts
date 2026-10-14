import { describe, expect, it } from "vitest";
import { QuoteStatus } from "@/types/enums";
import type { Quote } from "@/types/rfq";
import {
  budgetDeltaPercent,
  findHighlights,
  itemFor,
} from "@/utils/comparison";

const quote = (
  id: string,
  totalMinor: number,
  deliveryDays: number,
): Quote => ({
  id,
  rfqId: "rfq",
  status: QuoteStatus.SUBMITTED,
  revisionNo: 1,
  totalMinor,
  deliveryDays,
  notes: null,
  submittedAt: "2026-10-13T09:00:00Z",
  lastRevisedAt: "2026-10-13T09:00:00Z",
  items: [
    {
      lineItemId: "chairs",
      unitPriceMinor: 190_000,
      lineTotalMinor: 19_000_000,
    },
  ],
  attachments: [],
});

describe("comparison helpers", () => {
  it("marks the cheapest and the fastest quote (the example from the brief)", () => {
    const vendorA = quote("A", 35_000_000, 10); // 3,50,000 in 10 days
    const vendorB = quote("B", 36_000_000, 7); // 3,60,000 in 7 days
    const { lowestTotal, fastestDelivery } = findHighlights([vendorA, vendorB]);
    expect([...lowestTotal]).toEqual(["A"]);
    expect([...fastestDelivery]).toEqual(["B"]);
  });

  it("highlights every quote that ties", () => {
    const { lowestTotal } = findHighlights([
      quote("A", 100, 5),
      quote("B", 100, 9),
      quote("C", 150, 2),
    ]);
    expect([...lowestTotal].sort()).toEqual(["A", "B"]);
  });

  it("highlights nothing when there is nothing to compare", () => {
    const { lowestTotal, fastestDelivery } = findHighlights([
      quote("A", 100, 5),
    ]);
    expect(lowestTotal.size + fastestDelivery.size).toBe(0);
  });

  it("finds a quote's price for a line, and how far it is from the budget", () => {
    expect(itemFor(quote("A", 1, 1), "chairs")?.unitPriceMinor).toBe(190_000);
    expect(itemFor(quote("A", 1, 1), "desks")).toBeUndefined();
    expect(budgetDeltaPercent(35_000_000, 40_000_000)).toBe(-13);
    expect(budgetDeltaPercent(44_000_000, 40_000_000)).toBe(10);
    expect(budgetDeltaPercent(1, null)).toBeNull();
  });
});
