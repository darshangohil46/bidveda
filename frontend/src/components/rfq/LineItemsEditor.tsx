"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/common/SearchSelect";
import { newLineItemDraft } from "@/lib/rfq-form";
import type { LineItemDraft, LineItemErrors } from "@/types/rfq";
import { MAX_LINE_ITEMS, UNIT_OPTIONS } from "@/utils/constant";

interface LineItemsEditorProps {
  items: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  errors?: LineItemErrors;
  disabled?: boolean;
}

/** The heart of an RFQ: what you want, how many, in which unit. Rows reflow into stacks on phones. */
export function LineItemsEditor({
  items,
  onChange,
  errors = {},
  disabled,
}: LineItemsEditorProps) {
  function update(key: string, patch: Partial<LineItemDraft>) {
    onChange(
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  return (
    <div className="grid gap-3">
      <div className="t-caption hidden grid-cols-[2rem_minmax(0,1fr)_6.5rem_7rem_2rem] gap-2 px-1 sm:grid">
        <span>#</span>
        <span>Item</span>
        <span>Quantity</span>
        <span>Unit</span>
        <span />
      </div>

      <ol className="grid gap-3">
        {items.map((item, index) => {
          const rowErrors = errors[item.key] ?? {};
          return (
            <li
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_2rem] gap-2 rounded-sm border bg-card p-3 sm:grid-cols-[2rem_minmax(0,1fr)_6.5rem_7rem_2rem] sm:items-start sm:border-0 sm:bg-transparent sm:p-0"
            >
              <span className="t-figure hidden pt-2 text-[0.8125rem] text-ink-3 sm:block">
                {index + 1}
              </span>
              <div className="col-span-4 sm:col-span-1">
                <Input
                  aria-label={`Item ${index + 1} name`}
                  value={item.name}
                  disabled={disabled}
                  maxLength={200}
                  placeholder="e.g. Ergonomic office chair"
                  aria-invalid={!!rowErrors.name}
                  onChange={(event) =>
                    update(item.key, { name: event.target.value })
                  }
                  className="h-9 bg-card"
                />
                {rowErrors.name && (
                  <p className="mt-1 text-[0.75rem] text-rust">
                    {rowErrors.name}
                  </p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Input
                  aria-label={`Item ${index + 1} quantity`}
                  value={item.quantity}
                  disabled={disabled}
                  inputMode="decimal"
                  placeholder="Qty"
                  aria-invalid={!!rowErrors.quantity}
                  onChange={(event) =>
                    update(item.key, {
                      quantity: event.target.value.replace(/[^\d.]/g, ""),
                    })
                  }
                  className="t-figure h-9 bg-card text-right"
                />
                {rowErrors.quantity && (
                  <p className="mt-1 text-[0.75rem] text-rust">
                    {rowErrors.quantity}
                  </p>
                )}
              </div>
              <div className="col-span-1">
                <SearchSelect
                  id={`unit-${item.key}`}
                  ariaLabel={`Item ${index + 1} unit`}
                  value={item.unit}
                  selectedLabel={item.unit}
                  options={UNIT_OPTIONS}
                  allowCustom
                  maxLength={30}
                  placeholder="Unit"
                  searchPlaceholder="Search or type a unit"
                  disabled={disabled}
                  invalid={!!rowErrors.unit}
                  onChange={(option) =>
                    update(item.key, { unit: option?.value ?? "" })
                  }
                />
                {rowErrors.unit && (
                  <p className="mt-1 text-[0.75rem] text-rust">
                    {rowErrors.unit}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove item ${index + 1}`}
                disabled={disabled || items.length === 1}
                onClick={() =>
                  onChange(
                    items.filter((candidate) => candidate.key !== item.key),
                  )
                }
                className="col-span-1 mt-0.5 sm:col-span-1"
              >
                <Trash2 className="size-4 text-ink-3" />
              </Button>
            </li>
          );
        })}
      </ol>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || items.length >= MAX_LINE_ITEMS}
          onClick={() => onChange([...items, newLineItemDraft()])}
        >
          <Plus className="size-4" /> Add item
        </Button>
      </div>
    </div>
  );
}
