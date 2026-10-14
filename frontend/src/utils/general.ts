import { DEFAULT_CURRENCY } from "@/utils/constant";

/*
  Shared helpers. Every date, time, duration and money value shown in the UI goes
  through here so the whole product reads the same.
*/

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const PLACEHOLDER = "-";

/** 13 Oct 2026 */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** 5:00 PM */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace("am", "AM")
    .replace("pm", "PM");
}

/** 20 Nov 2026, 5:00 PM */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** The first moment of a "yyyy-MM-dd" day in the visitor's time zone, as an ISO string. */
export function startOfDayIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString();
}

/** The last moment of a "yyyy-MM-dd" day in the visitor's time zone, as an ISO string. */
export function endOfDayIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human duration, two largest units at most:
 * 20 min, 10 hours, 1 day, 1 day 15 hours. Zero or negative is "0 min".
 */
export function formatDuration(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds));
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);

  const plural = (count: number, unit: string) =>
    `${count} ${unit}${count === 1 ? "" : "s"}`;

  if (days > 0)
    return hours > 0
      ? `${plural(days, "day")} ${plural(hours, "hour")}`
      : plural(days, "day");
  if (hours > 0)
    return minutes > 0 && hours < 3
      ? `${plural(hours, "hour")} ${minutes} min`
      : plural(hours, "hour");
  return `${minutes} min`;
}

/** Delivery promise as shown in tables: 7 days. */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Amounts travel as integer minor units (paise). 3500000 -> ₹35,000 */
export function minorToMajor(minor: number): number {
  return minor / 100;
}

/** Parses what a person typed ("1,900.50") into minor units, or null if it is not a valid amount. */
export function majorToMinor(input: string | number): number | null {
  const text =
    typeof input === "number" ? String(input) : input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatMoney(
  minor: number | null | undefined,
  currency = DEFAULT_CURRENCY,
): string {
  if (minor === null || minor === undefined) return PLACEHOLDER;
  const major = minorToMajor(minor);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(
    quantity,
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLocation(
  parts: Array<string | null | undefined>,
): string {
  return parts.filter(Boolean).join(", ");
}

/** Only same-site, in-app paths are allowed as a post-login redirect (no open redirects). */
export function safeRedirect(
  path: string | string[] | undefined,
  fallback = "/",
): string {
  const value = Array.isArray(path) ? path[0] : path;
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return fallback;
  if (value.startsWith("/admin") || value.startsWith("/api")) return fallback;
  return value;
}

/** Message safe to show a person, from anything that was thrown. */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Delays `fn` until `delay` ms after the last call. Used for search inputs so the API is
 * hit once the person stops typing. `cancel()` drops a pending call (call it on unmount).
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the text looks like an id the API hands out. Used to answer "not found" for any other address. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
