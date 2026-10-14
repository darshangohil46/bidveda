import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parse,
  set,
  setMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { PickerMode } from "@/types/enums";

/*
 * The date maths behind the date / time picker, with no React in it.
 *
 * The picker hands its value to the form as text:
 *   date      "2026-10-14"
 *   time      "17:30"
 *   datetime  "2026-10-14T12:00:00.000Z"  (an ISO string)
 */

/** A date picked without a time starts at 5:00 PM. */
const DEFAULT_TIME = { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 };

/** With no min / max, the year list reaches this far back (birth dates) and ahead (deadlines). */
const YEARS_BACK = 100;
const YEARS_AHEAD = 20;

export type TimePart = "hour" | "minute" | "meridiem";

// ------------------------------------------------------------------ text <-> Date
/** Reads the picker's text value. Returns null for nothing chosen or text that is not a date. */
export function parsePickerValue(
  value: string | null,
  mode: PickerMode,
  reference: Date,
): Date | null {
  if (!value) return null;
  const date =
    mode === PickerMode.DATE
      ? parse(value, "yyyy-MM-dd", reference)
      : mode === PickerMode.TIME
        ? parse(value, "HH:mm", reference)
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function serializePickerValue(date: Date, mode: PickerMode): string {
  if (mode === PickerMode.DATE) return format(date, "yyyy-MM-dd");
  if (mode === PickerMode.TIME) return format(date, "HH:mm");
  return date.toISOString();
}

// --------------------------------------------------------------------- the range
/** Pulls a date back inside min and max. A time-only picker has no dates to limit. */
export function clampToRange(
  date: Date,
  mode: PickerMode,
  min?: Date,
  max?: Date,
): Date {
  if (mode === PickerMode.TIME) return date;
  if (min && isBefore(date, min)) return min;
  if (max && isAfter(date, max)) return max;
  return date;
}

export function isDayBlocked(day: Date, min?: Date, max?: Date): boolean {
  return (
    (!!min && isBefore(day, startOfDay(min))) || (!!max && isAfter(day, max))
  );
}

/** True when no day of that month (0 = January) is allowed. */
export function isMonthBlocked(
  month: Date,
  monthIndex: number,
  min?: Date,
  max?: Date,
): boolean {
  const first = setMonth(month, monthIndex);
  return (
    (!!min && isBefore(endOfMonth(first), startOfDay(min))) ||
    (!!max && isAfter(startOfMonth(first), max))
  );
}

/** The years offered in the year dropdown. Always includes the year being looked at. */
export function yearOptions(
  shownMonth: Date,
  today: Date,
  min?: Date,
  max?: Date,
): number[] {
  const first = Math.min(
    min?.getFullYear() ?? today.getFullYear() - YEARS_BACK,
    shownMonth.getFullYear(),
  );
  const last = Math.max(
    max?.getFullYear() ?? today.getFullYear() + YEARS_AHEAD,
    shownMonth.getFullYear(),
  );
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

// ---------------------------------------------------------------------- the grid
/** Every day shown for a month: whole weeks, Monday first, so it includes a few days of the months around it. */
export function monthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let day = start; !isAfter(day, end); day = addDays(day, 1))
    days.push(day);
  return days;
}

// --------------------------------------------------------------------- picking
/** The chosen day, keeping the time that was already set (or 5:00 PM when there was none). */
export function pickDay(day: Date, current: Date | null): Date {
  const base = current ?? set(day, DEFAULT_TIME);
  return set(day, {
    hours: base.getHours(),
    minutes: base.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

export interface Clock12 {
  /** 1 to 12 */
  hour: number;
  minute: number;
  pm: boolean;
}

export function to12Hour(date: Date): Clock12 {
  return {
    hour: date.getHours() % 12 || 12,
    minute: date.getMinutes(),
    pm: date.getHours() >= 12,
  };
}

/**
 * Changes one part of the time. `amount` is the hour (1-12), the minute (0-55) or the AM / PM
 * choice (0 = AM, 1 = PM). With no time chosen yet it starts from 5:00 PM today.
 */
export function changeTimePart(
  current: Date | null,
  today: Date,
  part: TimePart,
  amount: number,
): Date {
  const base = current ?? set(today, DEFAULT_TIME);
  const isPm = base.getHours() >= 12;

  let hours = base.getHours();
  let minutes = base.getMinutes();
  if (part === "hour") hours = (amount % 12) + (isPm ? 12 : 0);
  if (part === "minute") minutes = amount;
  if (part === "meridiem")
    hours = (base.getHours() % 12) + (amount === 1 ? 12 : 0);

  return set(base, { hours, minutes, seconds: 0, milliseconds: 0 });
}
