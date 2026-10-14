import { afterEach, describe, expect, it, vi } from "vitest";
import {
  debounce,
  endOfDayIso,
  formatDuration,
  formatMoney,
  isUuid,
  majorToMinor,
  safeRedirect,
  startOfDayIso,
} from "@/utils/general";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatDuration", () => {
  it("shows the two largest units", () => {
    expect(formatDuration(20 * MIN)).toBe("20 min");
    expect(formatDuration(10 * HOUR)).toBe("10 hours");
    expect(formatDuration(DAY)).toBe("1 day");
    expect(formatDuration(DAY + 15 * HOUR)).toBe("1 day 15 hours");
    expect(formatDuration(3 * DAY + 4 * HOUR + 30 * MIN)).toBe(
      "3 days 4 hours",
    );
  });

  it("never goes negative", () => {
    expect(formatDuration(-5000)).toBe("0 min");
  });
});

describe("money", () => {
  it("parses what people type into integer minor units without float errors", () => {
    expect(majorToMinor("1,900")).toBe(190_000);
    expect(majorToMinor("1900.5")).toBe(190_050);
    expect(majorToMinor("0.07")).toBe(7);
    expect(majorToMinor("19.999")).toBeNull();
    expect(majorToMinor("abc")).toBeNull();
  });

  it("formats rupees the Indian way", () => {
    expect(formatMoney(35_000_000)).toBe("₹3,50,000");
    expect(formatMoney(199_950)).toBe("₹1,999.50");
  });
});

describe("safeRedirect", () => {
  it("allows in-app paths only", () => {
    expect(safeRedirect("/buyer/rfqs/123")).toBe("/buyer/rfqs/123");
    expect(safeRedirect("https://evil.test")).toBe("/");
    expect(safeRedirect("//evil.test")).toBe("/");
    expect(safeRedirect("/admin/users")).toBe("/");
    expect(safeRedirect(undefined)).toBe("/");
  });
});

describe("debounce", () => {
  afterEach(() => vi.useRealTimers());

  it("fires once, after the last call", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const search = debounce(spy, 300);
    search("a");
    search("ab");
    search("abc");
    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("abc");
  });

  it("can be cancelled", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const search = debounce(spy, 300);
    search("x");
    search.cancel();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("startOfDayIso and endOfDayIso", () => {
  it("cover exactly one local day", () => {
    const start = new Date(startOfDayIso("2026-10-14"));
    const end = new Date(endOfDayIso("2026-10-14"));
    expect([
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ]).toEqual([2026, 9, 14, 0, 0]);
    expect([
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
      end.getSeconds(),
    ]).toEqual([14, 23, 59, 59]);
  });
});

describe("isUuid", () => {
  it("accepts an id and rejects anything else", () => {
    expect(isUuid("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUuid("new")).toBe(false);
    expect(isUuid("edit")).toBe(false);
  });
});
