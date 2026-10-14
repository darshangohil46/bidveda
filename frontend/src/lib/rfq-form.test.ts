import { describe, expect, it } from "vitest";
import { RfqStatus } from "@/types/enums";
import {
  canEditRfq,
  emptyRfqForm,
  hasErrors,
  newLineItemDraft,
  toRfqPayload,
  validateRfqForm,
  type RfqFormValues,
} from "@/lib/rfq-form";

const NOW = new Date("2026-10-14T10:00:00Z").getTime();

/** A form that passes every rule; each test breaks one thing. */
function validForm(): RfqFormValues {
  return {
    title: "Office chairs",
    description: "Forty ergonomic chairs with arm rests.",
    category: "Furniture",
    address: {
      address: "",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      pincode: "500001",
    },
    budget: "400000",
    deadline: "2026-10-20T11:30:00Z",
    lineItems: [
      newLineItemDraft({ name: "Chair", quantity: "40", unit: "pcs" }),
    ],
  };
}

describe("validateRfqForm", () => {
  it("accepts a complete form", () => {
    expect(hasErrors(validateRfqForm(validForm(), NOW))).toBe(false);
  });

  it("asks for the basics", () => {
    const errors = validateRfqForm(
      { ...validForm(), title: "ab", description: "short", category: "" },
      NOW,
    );
    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.category).toBeDefined();
  });

  it("treats the budget as optional but checks it when given", () => {
    expect(
      validateRfqForm({ ...validForm(), budget: "" }, NOW).budget,
    ).toBeUndefined();
    expect(
      validateRfqForm({ ...validForm(), budget: "12.345" }, NOW).budget,
    ).toBeDefined();
  });

  it("needs a deadline that is still in the future", () => {
    expect(
      validateRfqForm({ ...validForm(), deadline: null }, NOW).deadline,
    ).toMatch(/Set the submission deadline/);
    expect(
      validateRfqForm({ ...validForm(), deadline: "2026-10-14T09:00:00Z" }, NOW)
        .deadline,
    ).toMatch(/future/);
  });

  it("points at the exact line item that is wrong", () => {
    const good = newLineItemDraft({ name: "Desk", quantity: "5", unit: "pcs" });
    const bad = newLineItemDraft({ name: "", quantity: "0", unit: "" });
    const errors = validateRfqForm(
      { ...validForm(), lineItems: [good, bad] },
      NOW,
    );

    expect(errors.lineItems?.[good.key]).toBeUndefined();
    expect(errors.lineItems?.[bad.key]).toMatchObject({
      name: expect.any(String),
      quantity: expect.any(String),
      unit: expect.any(String),
    });
    expect(errors.lineItemsSummary).toBeDefined();
  });

  it("checks the address, including the pincode for the chosen country", () => {
    const empty = validateRfqForm(
      {
        ...validForm(),
        address: { address: "", city: "", state: "", country: "", pincode: "" },
      },
      NOW,
    );
    expect(empty.address).toMatchObject({
      country: "Choose a country.",
      state: "Choose a state.",
      city: "Choose a city.",
      pincode: "Pincode is required.",
    });

    const badPincode = validateRfqForm(
      { ...validForm(), address: { ...validForm().address, pincode: "12" } },
      NOW,
    );
    expect(badPincode.address?.pincode).toBe(
      "Enter a valid pincode for the selected country.",
    );
  });

  it("needs at least one line item", () => {
    expect(
      validateRfqForm({ ...validForm(), lineItems: [] }, NOW).lineItemsSummary,
    ).toBe("Add at least one item.");
  });

  it("allows a unit of the person's own, up to 30 characters", () => {
    const custom = newLineItemDraft({
      name: "Rope",
      quantity: "3",
      unit: "bundle of 12",
    });
    expect(
      hasErrors(validateRfqForm({ ...validForm(), lineItems: [custom] }, NOW)),
    ).toBe(false);

    const tooLong = newLineItemDraft({
      name: "Rope",
      quantity: "3",
      unit: "x".repeat(31),
    });
    expect(
      validateRfqForm({ ...validForm(), lineItems: [tooLong] }, NOW)
        .lineItems?.[tooLong.key]?.unit,
    ).toBe("Use 30 characters or fewer.");
  });

  it("allows at most 3 decimals in a quantity", () => {
    const item = newLineItemDraft({
      name: "Cable",
      quantity: "2.5555",
      unit: "m",
    });
    expect(
      validateRfqForm({ ...validForm(), lineItems: [item] }, NOW).lineItems?.[
        item.key
      ]?.quantity,
    ).toBe("Up to 3 decimals.");
  });
});

describe("toRfqPayload", () => {
  it("trims text, turns the budget into minor units and the deadline into an ISO string", () => {
    const payload = toRfqPayload({
      ...validForm(),
      title: "  Office chairs  ",
      budget: "1,900.50",
    });
    expect(payload.title).toBe("Office chairs");
    expect(payload.budgetMinor).toBe(190050);
    expect(payload.deadline).toBe("2026-10-20T11:30:00.000Z");
    expect(payload.lineItems).toEqual([
      { name: "Chair", quantity: 40, unit: "pcs" },
    ]);
  });

  it("sends no budget and no street line when they were left empty", () => {
    const payload = toRfqPayload({ ...validForm(), budget: "" });
    expect(payload.budgetMinor).toBeNull();
    expect(payload.deliveryAddress).toBeUndefined();
  });
});

describe("emptyRfqForm", () => {
  it("starts with one blank line item and the default country", () => {
    const form = emptyRfqForm();
    expect(form.lineItems).toHaveLength(1);
    expect(form.address.country).toBe("India");
    expect(form.deadline).toBeNull();
  });
});

describe("canEditRfq", () => {
  it("allows a draft and an open RFQ, but not a closed or awarded one", () => {
    expect(canEditRfq(RfqStatus.DRAFT)).toBe(true);
    expect(canEditRfq(RfqStatus.PUBLISHED)).toBe(true);
    expect(canEditRfq(RfqStatus.CLOSED)).toBe(false);
    expect(canEditRfq(RfqStatus.AWARDED)).toBe(false);
  });
});
