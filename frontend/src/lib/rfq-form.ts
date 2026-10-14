import { z } from "zod";
import { addressSchema, EMPTY_ADDRESS } from "@/lib/address";
import type { AddressErrors, AddressValue } from "@/types/address";
import { RfqStatus } from "@/types/enums";
import type {
  LineItemDraft,
  LineItemErrors,
  RfqDetail,
  RfqPayload,
} from "@/types/rfq";
import { DEFAULT_COUNTRY_NAME } from "@/utils/constant";
import { majorToMinor, minorToMajor } from "@/utils/general";

/*
 * The logic of the "New RFQ" form, with no React in it.
 *
 *   emptyRfqForm() / rfqFormFromDetail()   what the form starts with
 *   rfqFormSchema() + validateRfqForm()    the rules (a zod schema), one message per bad field
 *   toRfqPayload()                         what is sent to the API
 *
 * The form component only wires these to inputs, which keeps both halves easy to read and test.
 */

/** Everything typed into the form. Numbers stay as text until they are validated. */
export interface RfqFormValues {
  title: string;
  description: string;
  category: string;
  address: AddressValue;
  /** Whole amount as typed, e.g. "250000.50". Empty means no budget. */
  budget: string;
  /** ISO date-time, or null while nothing is chosen. */
  deadline: string | null;
  lineItems: LineItemDraft[];
}

export interface RfqFormErrors {
  title?: string;
  description?: string;
  category?: string;
  address?: AddressErrors;
  budget?: string;
  deadline?: string;
  lineItems?: LineItemErrors;
  lineItemsSummary?: string;
}

/**
 * A draft and an open RFQ can be edited. Closed and awarded ones cannot: the deadline has passed,
 * so the request every vendor priced stays as it was. (The server enforces this too.)
 */
export const canEditRfq = (status: RfqStatus) =>
  status === RfqStatus.DRAFT || status === RfqStatus.PUBLISHED;

export const hasErrors = (errors: RfqFormErrors) =>
  Object.keys(errors).length > 0;

// ------------------------------------------------------------------ starting values
let lastLineKey = 0;

/** A blank line item. The key only lets React tell rows apart; it is never sent to the API. */
export function newLineItemDraft(
  seed: Partial<Omit<LineItemDraft, "key">> = {},
): LineItemDraft {
  lastLineKey += 1;
  return {
    key: `line-${lastLineKey}`,
    name: "",
    quantity: "",
    unit: "pcs",
    ...seed,
  };
}

export function emptyRfqForm(): RfqFormValues {
  return {
    title: "",
    description: "",
    category: "",
    address: { ...EMPTY_ADDRESS, country: DEFAULT_COUNTRY_NAME },
    budget: "",
    deadline: null,
    lineItems: [newLineItemDraft()],
  };
}

/** The form filled in from a saved draft, for editing. */
export function rfqFormFromDetail(rfq: RfqDetail): RfqFormValues {
  return {
    title: rfq.title,
    description: rfq.description,
    category: rfq.category,
    address: {
      address: rfq.deliveryAddress ?? "",
      city: rfq.deliveryCity,
      state: rfq.deliveryState,
      country: rfq.deliveryCountry,
      pincode: rfq.deliveryPincode,
    },
    budget:
      rfq.budgetMinor != null ? String(minorToMajor(rfq.budgetMinor)) : "",
    deadline: rfq.deadline,
    lineItems: rfq.lineItems.map((item) =>
      newLineItemDraft({
        name: item.name,
        quantity: String(item.quantity),
        unit: item.unit,
      }),
    ),
  };
}

// ------------------------------------------------------------------------ the rules
const lineItemSchema = z.object({
  key: z.string(),
  name: z.string().trim().min(1, "Name the item."),
  quantity: z
    .string()
    .refine(
      (quantity) => Number.isFinite(Number(quantity)) && Number(quantity) > 0,
      "Enter a quantity.",
    )
    .refine(
      (quantity) => /^\d+(\.\d{1,3})?$/.test(quantity),
      "Up to 3 decimals.",
    ),
  unit: z
    .string()
    .trim()
    .min(1, "Unit?")
    .max(30, "Use 30 characters or fewer."),
});

/** The rules for the whole form. `nowMs` is a parameter so "the deadline is in the future" can be tested. */
export function rfqFormSchema(nowMs: number) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(3, "Give the RFQ a title of at least 3 characters."),
    description: z
      .string()
      .trim()
      .min(10, "Describe what you need in at least 10 characters."),
    category: z.string().min(1, "Choose a category."),
    address: addressSchema,
    // Optional: empty is fine, but anything typed must be an amount like 250000 or 250000.50.
    budget: z
      .string()
      .refine(
        (budget) => !budget.trim() || majorToMinor(budget) !== null,
        "Enter an amount like 250000 or 250000.50.",
      ),
    deadline: z
      .string()
      .nullable()
      .refine((deadline) => deadline !== null, "Set the submission deadline.")
      .refine(
        (deadline) => deadline === null || new Date(deadline).getTime() > nowMs,
        "The deadline must be in the future.",
      ),
    lineItems: z.array(lineItemSchema).min(1, "Add at least one item."),
  });
}

type LineItemError = LineItemErrors[string];

/** Turns zod's flat list of problems into the shape the form shows, keeping the first message per field. */
function toFormErrors(error: z.ZodError, values: RfqFormValues): RfqFormErrors {
  const errors: RfqFormErrors = {};

  for (const { path, message } of error.issues) {
    const [field, second, third] = path;

    if (field === "address" && typeof second === "string") {
      const key = second as keyof AddressValue;
      errors.address = {
        ...errors.address,
        [key]: errors.address?.[key] ?? message,
      };
    } else if (
      field === "lineItems" &&
      typeof second === "number" &&
      typeof third === "string"
    ) {
      // Errors are filed under the row's key, so they stay with the right row if rows are added or removed.
      const rowKey = values.lineItems[second].key;
      const column = third as keyof LineItemError;
      const row = errors.lineItems?.[rowKey] ?? {};
      errors.lineItems = {
        ...errors.lineItems,
        [rowKey]: { ...row, [column]: row[column] ?? message },
      };
      errors.lineItemsSummary = "Fix the highlighted items.";
    } else if (field === "lineItems") {
      errors.lineItemsSummary ??= message;
    } else if (typeof field === "string") {
      const key = field as
        | "title"
        | "description"
        | "category"
        | "budget"
        | "deadline";
      errors[key] ??= message;
    }
  }
  return errors;
}

/** Returns an empty object when everything is fine. */
export function validateRfqForm(
  values: RfqFormValues,
  nowMs: number,
): RfqFormErrors {
  const result = rfqFormSchema(nowMs).safeParse(values);
  return result.success ? {} : toFormErrors(result.error, values);
}

// ------------------------------------------------------------------ what the API gets
/** Only call this after validateRfqForm returned no errors. */
export function toRfqPayload(values: RfqFormValues): RfqPayload {
  const { address } = values;
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    deliveryAddress: address.address.trim() || undefined,
    deliveryCity: address.city.trim(),
    deliveryState: address.state.trim(),
    deliveryCountry: address.country.trim(),
    deliveryPincode: address.pincode.trim(),
    budgetMinor: values.budget.trim() ? majorToMinor(values.budget) : null,
    deadline: new Date(values.deadline as string).toISOString(),
    lineItems: values.lineItems.map((item) => ({
      name: item.name.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
    })),
  };
}
