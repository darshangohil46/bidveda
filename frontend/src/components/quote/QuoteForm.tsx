"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AttachmentList } from "@/components/common/AttachmentList";
import { Countdown } from "@/components/common/Countdown";
import { FileUploader } from "@/components/common/FileUploader";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { QuoteRevisions } from "@/components/quote/QuoteRevisions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/baseApi";
import {
  calculateTotals,
  hasQuoteErrors,
  quoteFormFromExisting,
  toQuotePayload,
  validateQuoteForm,
  type QuoteFormErrors,
  type QuoteFormValues,
} from "@/lib/quote-form";
import { attachmentService } from "@/services/attachment.service";
import { quoteService } from "@/services/quote.service";
import { UserRole } from "@/types/enums";
import type { Attachment, Quote, RfqDetail } from "@/types/rfq";
import { rfqRoute } from "@/utils/constant";
import { formatMoney, formatQuantity, getErrorMessage } from "@/utils/general";

interface QuoteFormProps {
  rfq: RfqDetail;
  /** The vendor's current quote, when revising. */
  existing: Quote | null;
}

/**
 * The vendor's quote: one price per line item, delivery time and notes.
 *
 * How it works:
 *  1. Everything typed lives in `values`. The line totals and the grand total are worked out from
 *     it while typing (lib/quote-form.ts). They are for the vendor's convenience only: the server
 *     calculates the real total again from the unit prices.
 *  2. "Submit quote" checks the rules, sends the quote, then uploads any new documents.
 *  3. Sending a quote again after changes makes a new revision; nothing is ever overwritten.
 */
export function QuoteForm({ rfq, existing }: QuoteFormProps) {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [values, setValues] = useState<QuoteFormValues>(() =>
    quoteFormFromExisting(rfq, existing),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [savedFiles, setSavedFiles] = useState<Attachment[]>(
    existing?.attachments ?? [],
  );
  const [errors, setErrors] = useState<QuoteFormErrors>({ prices: {} });
  const [busy, setBusy] = useState(false);

  const { lineTotals, total } = calculateTotals(rfq.lineItems, values.prices);
  const overBudget =
    total !== null && rfq.budgetMinor !== null && total > rfq.budgetMinor;

  function setPrice(lineItemId: string, price: string) {
    setValues((current) => ({
      ...current,
      prices: { ...current.prices, [lineItemId]: price },
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateQuoteForm(values, rfq.lineItems);
    setErrors(found);
    if (hasQuoteErrors(found)) {
      error(
        "Some fields need attention",
        "Every line item needs a price and the quote needs a delivery time.",
      );
      return;
    }

    setBusy(true);
    try {
      // 1. Send the quote itself.
      const saved = await quoteService.submit(
        rfq.id,
        toQuotePayload(values, rfq.lineItems),
      );

      // 2. Upload the documents that were just added.
      const failed = await attachmentService.uploadEach(files, (file) =>
        attachmentService.uploadToQuote(saved.id, file),
      );
      if (failed.length > 0)
        error("Some files were not uploaded", failed.join(", "));

      // 3. Tell the vendor what happened, then go back to the RFQ.
      if (!existing)
        success(
          "Quote submitted",
          "You can revise it any time before the deadline.",
        );
      else if (saved.revisionNo > existing.revisionNo)
        success("Quote revised", `Saved as revision ${saved.revisionNo}.`);
      else info("Nothing changed", "Your quote is already up to date.");
      router.push(rfqRoute(UserRole.VENDOR, rfq.id));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "DEADLINE_PASSED") {
        error(
          "The deadline has passed",
          "Quotes can no longer be submitted or changed.",
        );
        router.replace(rfqRoute(UserRole.VENDOR, rfq.id));
        return;
      }
      error("Could not save your quote", getErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber/30 bg-amber-soft px-4 py-3">
        <p className="text-[0.8125rem] text-ink">
          Quotes lock at the deadline. After that nothing can be submitted or
          changed.
        </p>
        <Countdown
          deadline={rfq.deadline}
          skewMs={rfq.clockSkewMs}
          className="text-[0.875rem]"
        />
      </div>

      <FormSection
        title="Your prices"
        description="Price one unit of each item. Totals are worked out for you and checked again on the server."
      >
        <div className="overflow-hidden rounded-sm border bg-card">
          <div className="divide-y">
            <div className="t-caption hidden grid-cols-[minmax(0,1fr)_10rem_9rem] gap-4 bg-sunken px-4 py-2 sm:grid">
              <span>Item</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Line total</span>
            </div>
            {rfq.lineItems.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem] sm:items-start sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-medium text-ink">
                    {item.name}
                  </p>
                  <p className="t-figure text-[0.75rem] text-ink-3">
                    {formatQuantity(item.quantity)} {item.unit}
                  </p>
                </div>
                <div>
                  <MoneyInput
                    id={`price-${item.id}`}
                    value={values.prices[item.id] ?? ""}
                    onChange={(price) => setPrice(item.id, price)}
                    currency={rfq.currency}
                    invalid={!!errors.prices[item.id]}
                  />
                  {errors.prices[item.id] && (
                    <p className="mt-1 text-[0.75rem] text-rust">
                      {errors.prices[item.id]}
                    </p>
                  )}
                </div>
                <p
                  className="t-figure text-right text-[0.875rem] text-ink sm:pt-2"
                  aria-label={`Line total for item ${index + 1}`}
                >
                  {lineTotals[index] === null ? (
                    <span className="text-ink-3">-</span>
                  ) : (
                    formatMoney(lineTotals[index], rfq.currency)
                  )}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t bg-sunken px-4 py-3">
            <span className="text-[0.875rem] font-medium text-ink">Total</span>
            <span
              className="t-figure text-[1.375rem] leading-none text-ink"
              aria-live="polite"
            >
              {total === null ? "-" : formatMoney(total, rfq.currency)}
            </span>
          </div>
        </div>
        {overBudget && rfq.budgetMinor !== null && (
          <p className="text-[0.8125rem] text-amber">
            This is above the buyer&apos;s budget of{" "}
            {formatMoney(rfq.budgetMinor, rfq.currency)}. You can still submit
            it.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Delivery and terms"
        description="What the buyer compares besides the price."
      >
        <FormField
          label="Delivery time"
          htmlFor="quote-delivery"
          required
          error={errors.delivery}
          hint="Days from award to delivery."
        >
          <div className="relative w-40">
            <Input
              id="quote-delivery"
              value={values.deliveryDays}
              inputMode="numeric"
              maxLength={4}
              aria-invalid={!!errors.delivery}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  deliveryDays: event.target.value.replace(/\D/g, ""),
                }))
              }
              className="t-figure h-9 bg-card pr-12 text-right"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.8125rem] text-ink-3">
              days
            </span>
          </div>
        </FormField>

        <FormField
          label="Notes"
          htmlFor="quote-notes"
          hint="Optional: warranty, payment terms, assumptions."
        >
          <Textarea
            id="quote-notes"
            value={values.notes}
            rows={4}
            maxLength={2000}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            className="bg-card"
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Supporting documents"
        description="PDF or XLSX: datasheets, brochures, a detailed price list."
      >
        {savedFiles.length > 0 && (
          <AttachmentList
            attachments={savedFiles}
            canRemove={() => true}
            onRemoved={(removed) =>
              setSavedFiles((current) =>
                current.filter((file) => file.id !== removed.id),
              )
            }
          />
        )}
        <FileUploader
          files={files}
          onChange={setFiles}
          maxFiles={Math.max(0, 10 - savedFiles.length)}
          disabled={busy}
        />
      </FormSection>

      {existing?.revisions && (
        <div className="border-t py-7">
          <QuoteRevisions
            revisions={existing.revisions}
            currency={rfq.currency}
          />
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse items-stretch gap-2 border-t bg-background/95 px-4 py-3 sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:px-0">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {existing ? "Save revision" : "Submit quote"}
        </Button>
      </div>
    </form>
  );
}
