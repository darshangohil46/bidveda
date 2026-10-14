import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { BuyerRfqActions } from "@/components/rfq/BuyerRfqActions";
import { RfqDetailLayout } from "@/components/rfq/RfqDetailLayout";
import { RfqForm } from "@/components/rfq/RfqForm";
import { RfqList } from "@/components/rfq/RfqList";
import { RfqRow } from "@/components/rfq/RfqRow";
import { RfqStatusTabs } from "@/components/rfq/RfqStatusTabs";
import { VendorRfqActions } from "@/components/rfq/VendorRfqActions";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { SearchSelect } from "@/components/common/SearchSelect";
import { LineItemsEditor } from "@/components/rfq/LineItemsEditor";
import { newLineItemDraft } from "@/lib/rfq-form";
import { ResourceTable } from "@/components/admin/ResourceTable";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import {
  PickerMode,
  QuoteStatus,
  RfqStatus,
  SortOrder,
  UserRole,
  FieldType,
} from "@/types/enums";
import type { RfqDetail } from "@/types/rfq";

// These components only need the router to navigate after an action; rendering never calls it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
}));

const html = (element: ReactElement) => renderToStaticMarkup(element);

const rfq: RfqDetail = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Office chairs",
  description: "Forty ergonomic chairs.",
  category: "Furniture",
  status: RfqStatus.PUBLISHED,
  deadline: "2026-12-20T11:30:00.000Z",
  deliveryAddress: null,
  deliveryCity: "Hyderabad",
  deliveryState: "Telangana",
  deliveryCountry: "India",
  deliveryPincode: "500001",
  budgetMinor: 40_000_000,
  currency: "INR",
  publishedAt: "2026-10-14T05:00:00.000Z",
  awardedAt: null,
  createdAt: "2026-10-14T05:00:00.000Z",
  updatedAt: "2026-10-14T05:00:00.000Z",
  buyerCompany: "Acme Corp",
  lineItems: [
    { id: "line-1", position: 1, name: "Chair", quantity: 40, unit: "pcs" },
  ],
  attachments: [],
  serverTime: "2026-10-14T05:00:00.000Z",
  quoteCount: 2,
};

describe("the refactored components render", () => {
  it("shows the new RFQ form and the edit form filled from a draft", () => {
    expect(
      html(createElement(RfqForm, { onSaved: vi.fn(), onCancel: vi.fn() })),
    ).toContain("Publish RFQ");
    const edit = html(
      createElement(RfqForm, {
        initial: { ...rfq, status: RfqStatus.DRAFT },
        onSaved: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(edit).toContain("Office chairs");
    expect(edit).toContain("Forty ergonomic chairs.");
  });

  it("shows the quote form with one price box per line item", () => {
    const markup = html(createElement(QuoteForm, { rfq, existing: null }));
    expect(markup).toContain("Submit quote");
    expect(markup).toContain("Chair");
    expect(markup).toContain('id="price-line-1"');
  });

  it("shows the sign-in and sign-up forms", () => {
    expect(html(createElement(LoginForm, { redirectTo: "/" }))).toContain(
      "Sign in",
    );
    expect(
      html(createElement(SignupForm, { defaultRole: UserRole.VENDOR })),
    ).toContain("Create your account");
  });

  it("shows the buyer actions that fit each stage of an RFQ", () => {
    const draft = html(
      createElement(BuyerRfqActions, {
        rfq: { ...rfq, status: RfqStatus.DRAFT },
        onChanged: vi.fn(),
      }),
    );
    expect(draft).toContain("Publish");
    expect(draft).toContain("Delete");
    expect(draft).not.toContain("Compare");

    const open = html(
      createElement(BuyerRfqActions, { rfq, onChanged: vi.fn() }),
    );
    expect(open).toContain("Compare quotes");
    expect(open).toContain("(2)");

    const closed = html(
      createElement(BuyerRfqActions, {
        rfq: { ...rfq, status: RfqStatus.CLOSED },
        onChanged: vi.fn(),
      }),
    );
    expect(closed).toContain("Compare and award");
  });

  it("shows the vendor action only while the RFQ is open", () => {
    expect(html(createElement(VendorRfqActions, { rfq }))).toContain(
      "Submit a quote",
    );
    expect(
      html(
        createElement(VendorRfqActions, {
          rfq: {
            ...rfq,
            myQuote: {
              id: "q",
              status: QuoteStatus.SUBMITTED,
              totalMinor: 1,
              deliveryDays: 1,
              revisionNo: 1,
              lastRevisedAt: "2026-10-14T05:00:00.000Z",
            },
          },
        }),
      ),
    ).toContain("Revise your quote");
    expect(
      html(
        createElement(VendorRfqActions, {
          rfq: { ...rfq, status: RfqStatus.CLOSED },
        }),
      ),
    ).toBe("");
  });

  it("builds the shared RFQ detail page for either role", () => {
    const markup = html(
      createElement(RfqDetailLayout, {
        rfq,
        role: UserRole.BUYER,
        subtitle: rfq.category,
        actions: createElement("span", null, "ACTIONS"),
      }),
    );
    expect(markup).toContain("Office chairs");
    expect(markup).toContain("What is needed");
    expect(markup).toContain("ACTIONS");
    expect(markup).toContain("My RFQs");
  });

  it("shows the line items with the unit as a dropdown", () => {
    const markup = html(
      createElement(LineItemsEditor, {
        items: [
          newLineItemDraft({ name: "Rope", quantity: "3", unit: "bundle" }),
        ],
        onChange: vi.fn(),
      }),
    );
    expect(markup).toContain('aria-label="Item 1 unit"');
    expect(markup).toContain("bundle"); // a unit that is not in the list still shows on the button
    expect(markup).not.toContain("<datalist");
  });

  it("shows the dropdown button with the chosen option or its placeholder", () => {
    const options = [{ value: "a", label: "Alpha" }];
    expect(
      html(
        createElement(SearchSelect, { value: "a", options, onChange: vi.fn() }),
      ),
    ).toContain("Alpha");
    expect(
      html(
        createElement(SearchSelect, {
          value: null,
          options,
          onChange: vi.fn(),
          placeholder: "Pick one",
        }),
      ),
    ).toContain("Pick one");
  });

  it("shows an RFQ row whose title is the link, with an optional button beside it", () => {
    const item = {
      id: rfq.id,
      title: rfq.title,
      category: rfq.category,
      status: RfqStatus.DRAFT,
      deadline: rfq.deadline,
      deliveryCity: "Hyderabad",
      deliveryState: "Telangana",
      deliveryCountry: "India",
      budgetMinor: null,
      currency: "INR",
      createdAt: rfq.createdAt,
      publishedAt: null,
      lineItemCount: 1,
      quoteCount: 0,
    };
    const plain = html(
      createElement(RfqRow, { rfq: item, variant: UserRole.BUYER }),
    );
    expect(plain).toContain('href="/buyer/rfqs/' + rfq.id + '"');
    expect(plain).not.toContain("EDIT-BUTTON");

    const withAction = html(
      createElement(RfqRow, {
        rfq: item,
        variant: UserRole.BUYER,
        action: createElement("button", null, "EDIT-BUTTON"),
        showActionColumn: true,
      }),
    );
    expect(withAction).toContain("EDIT-BUTTON");
    expect(withAction.match(/<a /g)).toHaveLength(1); // the button is not inside a second link
  });

  it("keeps header and rows on the same columns, even for a row that has no button", () => {
    const item = {
      id: rfq.id,
      title: rfq.title,
      category: rfq.category,
      status: RfqStatus.CLOSED,
      deadline: rfq.deadline,
      deliveryCity: "Hyderabad",
      deliveryState: "Telangana",
      deliveryCountry: "India",
      budgetMinor: null,
      currency: "INR",
      createdAt: rfq.createdAt,
      publishedAt: null,
      lineItemCount: 1,
      quoteCount: 0,
    };
    const markup = html(
      createElement(RfqList, {
        items: [item],
        variant: UserRole.BUYER,
        empty: null,
        renderAction: () => null,
      }),
    );
    const grids = markup.match(/md:grid-cols-\[[^\]]+\]/g) ?? [];
    expect(grids).toHaveLength(2); // the header and the one row
    expect(new Set(grids).size).toBe(1); // both use the very same columns
    expect(grids[0]).toContain("_2rem]"); // including the one for the button
  });

  it("shows the status tabs with their counts", () => {
    const counts = {
      [RfqStatus.DRAFT]: 1,
      [RfqStatus.PUBLISHED]: 2,
      [RfqStatus.CLOSED]: 0,
      [RfqStatus.AWARDED]: 3,
    };
    const markup = html(
      createElement(RfqStatusTabs, { value: "", onChange: vi.fn(), counts }),
    );
    expect(markup).toContain("All");
    expect(markup).toContain(">6<"); // 1 + 2 + 0 + 3
  });

  it("shows the date picker button for each mode", () => {
    expect(
      html(
        createElement(DateTimePicker, {
          mode: PickerMode.DATE,
          value: "2026-10-14",
          onChange: vi.fn(),
        }),
      ),
    ).toContain("14 Oct 2026");
    expect(
      html(
        createElement(DateTimePicker, {
          mode: PickerMode.TIME,
          value: null,
          onChange: vi.fn(),
          placeholder: "Pick a time",
        }),
      ),
    ).toContain("Pick a time");
  });

  it("keeps the date button and its clear button in one block, so the cross sits centred on the text", () => {
    const markup = html(
      createElement(DateTimePicker, {
        mode: PickerMode.DATE,
        value: "2026-10-14",
        onChange: vi.fn(),
      }),
    );
    expect(markup).toContain('class="relative flex"');
    expect(markup).toContain('aria-label="Clear"');
  });

  it("shows the admin table with a sort arrow on the sorted column", () => {
    const columns = [
      { name: "name", label: "Name", type: FieldType.STRING },
      { name: "role", label: "Role", type: FieldType.FK },
    ];
    const markup = html(
      createElement(ResourceTable, {
        columns,
        rows: [{ id: "1", name: "Asha", role: { id: "r", label: "Editor" } }],
        sort: { by: "name", order: SortOrder.ASC },
        onSort: vi.fn(),
        canUpdate: true,
        canDelete: false,
        onOpen: vi.fn(),
        onDelete: vi.fn(),
        loading: false,
      }),
    );
    expect(markup).toContain("Asha");
    expect(markup).toContain("Editor");
    expect(markup).toContain('aria-label="Sort by Name"');
    expect(markup).not.toContain('aria-label="Sort by Role"'); // foreign keys cannot be sorted
    expect(markup).not.toContain('aria-label="Delete"');
  });
});
