import { describe, expect, it } from "vitest";
import {
  changeTimePart,
  clampToRange,
  isDayBlocked,
  isMonthBlocked,
  monthGrid,
  parsePickerValue,
  pickDay,
  serializePickerValue,
  to12Hour,
  yearOptions,
} from "@/lib/date-picker";
import { PickerMode } from "@/types/enums";

// Dates are built in local time so the tests give the same answer in every time zone.
const at = (year: number, month: number, day: number, hours = 0, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes);
const TODAY = at(2026, 10, 14, 9, 0);

describe("reading and writing the picker's text value", () => {
  it("round-trips a date and a time", () => {
    expect(serializePickerValue(at(2026, 10, 14), PickerMode.DATE)).toBe(
      "2026-10-14",
    );
    expect(serializePickerValue(at(2026, 10, 14, 17, 5), PickerMode.TIME)).toBe(
      "17:05",
    );

    const date = parsePickerValue("2026-10-14", PickerMode.DATE, TODAY);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getDate()).toBe(14);
    expect(
      parsePickerValue("17:05", PickerMode.TIME, TODAY)?.getMinutes(),
    ).toBe(5);
  });

  it("returns null for nothing or for text that is not a date", () => {
    expect(parsePickerValue(null, PickerMode.DATE, TODAY)).toBeNull();
    expect(parsePickerValue("", PickerMode.DATE, TODAY)).toBeNull();
    expect(
      parsePickerValue("not a date", PickerMode.DATETIME, TODAY),
    ).toBeNull();
  });
});

describe("the month grid", () => {
  it("shows whole weeks starting on Monday", () => {
    const days = monthGrid(at(2026, 10, 1));
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1); // Monday
    // 1 October 2026 is a Thursday, so the grid starts on Monday 28 September.
    expect(days[0].getMonth()).toBe(8);
    expect(days[0].getDate()).toBe(28);
  });
});

describe("limits", () => {
  const min = at(2026, 10, 14, 15, 0);

  it("blocks days before min but not min's own day", () => {
    expect(isDayBlocked(at(2026, 10, 13), min)).toBe(true);
    expect(isDayBlocked(at(2026, 10, 14), min)).toBe(false);
  });

  it("blocks a month only when every day of it is out of range", () => {
    expect(isMonthBlocked(at(2026, 10, 1), 8, min)).toBe(true); // September
    expect(isMonthBlocked(at(2026, 10, 1), 9, min)).toBe(false); // October
  });

  it("clamps a date into the range, except for a time-only picker", () => {
    expect(clampToRange(at(2026, 10, 1), PickerMode.DATE, min)).toEqual(min);
    expect(clampToRange(at(2026, 10, 1), PickerMode.TIME, min)).toEqual(
      at(2026, 10, 1),
    );
  });

  it("offers 100 years back and 20 ahead unless limited", () => {
    const years = yearOptions(at(2026, 10, 1), TODAY);
    expect(years[0]).toBe(1926);
    expect(years.at(-1)).toBe(2046);
    expect(yearOptions(at(2026, 10, 1), TODAY, min, at(2028, 1, 1))).toEqual([
      2026, 2027, 2028,
    ]);
  });
});

describe("picking", () => {
  it("gives a day without a time 5:00 PM, and keeps the time once there is one", () => {
    const first = pickDay(at(2026, 10, 20), null);
    expect([first.getHours(), first.getMinutes()]).toEqual([17, 0]);

    const second = pickDay(at(2026, 10, 21), at(2026, 10, 20, 9, 30));
    expect([second.getDate(), second.getHours(), second.getMinutes()]).toEqual([
      21, 9, 30,
    ]);
  });

  it("changes the hour inside the same half of the day", () => {
    expect(
      changeTimePart(at(2026, 10, 20, 15, 10), TODAY, "hour", 4).getHours(),
    ).toBe(16); // 3 PM -> 4 PM
    expect(
      changeTimePart(at(2026, 10, 20, 9, 10), TODAY, "hour", 12).getHours(),
    ).toBe(0); // 9 AM -> 12 AM
  });

  it("flips between AM and PM without changing the hour on the clock", () => {
    expect(
      changeTimePart(at(2026, 10, 20, 9, 0), TODAY, "meridiem", 1).getHours(),
    ).toBe(21);
    expect(
      changeTimePart(at(2026, 10, 20, 21, 0), TODAY, "meridiem", 0).getHours(),
    ).toBe(9);
  });

  it("starts from 5:00 PM today when no time was chosen yet", () => {
    const picked = changeTimePart(null, TODAY, "minute", 30);
    expect([picked.getDate(), picked.getHours(), picked.getMinutes()]).toEqual([
      14, 17, 30,
    ]);
  });

  it("reads a date as a 12-hour clock", () => {
    expect(to12Hour(at(2026, 10, 14, 0, 5))).toEqual({
      hour: 12,
      minute: 5,
      pm: false,
    });
    expect(to12Hour(at(2026, 10, 14, 13, 45))).toEqual({
      hour: 1,
      minute: 45,
      pm: true,
    });
  });
});
