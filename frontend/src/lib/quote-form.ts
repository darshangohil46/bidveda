import { z } from "zod";
import type { LineItem, Quote, QuotePayload, RfqDetail } from "@/types/rfq";
import { majorToMinor, minorToMajor } from "@/utils/general";

/*
 * The logic of the vendor's quote form, with no React in it.
 *
 *   quoteFormFromExisting()   what the form starts with (empty, or the vendor's current quote)
 *   calculateTotals()         the live line totals and the grand total shown while typing
 *   validateQuoteForm()       the rules (a zod schema), one message per bad field
 *   toQuotePayload()          what is sent to the API
 *
 * The totals shown are only a convenience: the server works them out again from the unit prices.
 */

export interface QuoteFormValues {
  /** Unit price as typed, by line item id. Empty means not priced yet. */
  prices: Record<string, string>;
  /** Whole days, as typed. */
  deliveryDays: string;
  notes: string;
}

export interface QuoteFormErrors {
  /** Message by line item id. */
  prices: Record<string, string>;
  delivery?: string;
}

export const hasQuoteErrors = (errors: QuoteFormErrors) =>
  Object.keys(errors.prices).length > 0 || !!errors.delivery;

// ------------------------------------------------------------------ starting values
export function quoteFormFromExisting(
  rfq: RfqDetail,
  existing: Quote | null,
): QuoteFormValues {
  const prices: Record<string, string> = {};
  for (const item of rfq.lineItems) {
    const previous = existing?.items.find(
      (entry) => entry.lineItemId === item.id,
    );
    prices[item.id] = previous
      ? String(minorToMajor(previous.unitPriceMinor))
      : "";
  }
  return {
    prices,
    deliveryDays: existing ? String(existing.deliveryDays) : "",
    notes: existing?.notes ?? "",
  };
}

// ------------------------------------------------------------------------- totals
export interface QuoteTotals {
  /** Quantity times unit price for each line, or null while that line has no valid price. */
  lineTotals: Array<number | null>;
  /** The sum, or null until every line is priced. */
  total: number | null;
}

export function calculateTotals(
  lineItems: LineItem[],
  prices: Record<string, string>,
): QuoteTotals {
  const lineTotals = lineItems.map((item) => {
    const unit = majorToMinor(prices[item.id] ?? "");
    return unit === null ? null : Math.round(item.quantity * unit);
  });
  const allPriced = lineTotals.every((total) => total !== null);
  const total = allPriced
    ? lineTotals.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  return { lineTotals, total };
}

// ------------------------------------------------------------------------ the rules
const priceSchema = z.string().refine((price) => {
  const unit = majorToMinor(price);
  return unit !== null && unit >= 1;
}, "Enter a price greater than zero.");

const deliverySchema = z.string().refine((days) => {
  const count = Number(days);
  return Number.isInteger(count) && count >= 1 && count <= 3650;
}, "Enter delivery time in whole days (1 to 3650).");

/** Every line item of this RFQ needs a price, so the schema is built from the RFQ's lines. */
function quoteFormSchema(lineItems: LineItem[]) {
  return z.object({
    prices: z.object(
      Object.fromEntries(lineItems.map((item) => [item.id, priceSchema])),
    ),
    deliveryDays: deliverySchema,
  });
}

/** Returns no messages when everything is fine. */
export function validateQuoteForm(
  values: QuoteFormValues,
  lineItems: LineItem[],
): QuoteFormErrors {
  const prices = Object.fromEntries(
    lineItems.map((item) => [item.id, values.prices[item.id] ?? ""]),
  );
  const result = quoteFormSchema(lineItems).safeParse({
    prices,
    deliveryDays: values.deliveryDays,
  });

  const errors: QuoteFormErrors = { prices: {} };
  if (result.success) return errors;

  for (const { path, message } of result.error.issues) {
    if (path[0] === "prices" && typeof path[1] === "string")
      errors.prices[path[1]] ??= message;
    else if (path[0] === "deliveryDays") errors.delivery ??= message;
  }
  return errors;
}

// ------------------------------------------------------------------ what the API gets
/** Only call this after validateQuoteForm returned no messages. */
export function toQuotePayload(
  values: QuoteFormValues,
  lineItems: LineItem[],
): QuotePayload {
  return {
    items: lineItems.map((item) => ({
      lineItemId: item.id,
      unitPriceMinor: majorToMinor(values.prices[item.id]) as number,
    })),
    deliveryDays: Number(values.deliveryDays),
    notes: values.notes.trim() || undefined,
  };
}
