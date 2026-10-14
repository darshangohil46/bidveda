"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { addDays, set as setTime } from "date-fns";
import { Loader2 } from "lucide-react";
import { AttachmentList } from "@/components/common/AttachmentList";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { FileUploader } from "@/components/common/FileUploader";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { SearchSelect } from "@/components/common/SearchSelect";
import { LineItemsEditor } from "@/components/rfq/LineItemsEditor";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useNow } from "@/hooks/use-now";
import { useToast } from "@/hooks/use-toast";
import {
  emptyRfqForm,
  hasErrors,
  rfqFormFromDetail,
  toRfqPayload,
  validateRfqForm,
  type RfqFormErrors,
  type RfqFormValues,
} from "@/lib/rfq-form";
import { attachmentService } from "@/services/attachment.service";
import { rfqService } from "@/services/rfq.service";
import { PickerMode, RfqStatus } from "@/types/enums";
import type { Attachment, RfqDetail } from "@/types/rfq";
import { RFQ_CATEGORY_OPTIONS } from "@/utils/constant";
import { formatDateTime, getErrorMessage } from "@/utils/general";

// The address data set is large; load it only when this form is on screen.
const AddressFields = dynamic(
  () =>
    import("@/components/common/AddressFields").then(
      (module) => module.AddressFields,
    ),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

/** The "3 days / 1 week / 2 weeks" buttons next to the deadline. They all pick 5:00 PM. */
const QUICK_DEADLINES = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

interface RfqFormProps {
  /** The draft to edit. Leave out to start a new RFQ. */
  initial?: RfqDetail;
  /** Called after the RFQ was saved (as a draft or published). */
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * The form for creating an RFQ, or editing a draft (when `initial` is given). It lives inside a modal.
 *
 * How it works:
 *  1. Everything typed lives in one object, `values`. `set("title", "Chairs")` changes one field.
 *  2. "Save draft" and "Publish RFQ" both call `submit()`. It checks the rules (lib/rfq-form.ts).
 *     If something is wrong it shows the messages under the fields and stops.
 *  3. If all is fine, `submit()` does three things in order: save the RFQ, upload the new files,
 *     and publish only when "Publish RFQ" was pressed.
 *  4. An RFQ that is already open is only saved (there is no "Save draft" or "Publish" for it), and its
 *     line items are locked once a vendor has quoted.
 *  5. Once the RFQ is saved the form remembers its id (`draftId`), so pressing the button again
 *     after a later step failed updates that RFQ instead of creating a second one.
 */
export function RfqForm({ initial, onSaved, onCancel }: RfqFormProps) {
  const { success, error: showError, info } = useToast();
  const now = useNow(60_000);

  const [values, setValues] = useState<RfqFormValues>(() =>
    initial ? rfqFormFromDetail(initial) : emptyRfqForm(),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<Attachment[]>(
    initial?.attachments ?? [],
  );
  const [draftId, setDraftId] = useState<string | null>(initial?.id ?? null);
  const [errors, setErrors] = useState<RfqFormErrors>({});
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);

  // An RFQ that is already open is only saved: it is not a draft any more and cannot be published again.
  const isOpen = initial?.status === RfqStatus.PUBLISHED;
  // Quotes point at the line items, so once a vendor has quoted they can no longer be changed.
  const lineItemsLocked = isOpen && (initial?.quoteCount ?? 0) > 0;

  function set<Key extends keyof RfqFormValues>(
    key: Key,
    value: RfqFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setQuickDeadline(days: number) {
    const day = addDays(new Date(now), days);
    set(
      "deadline",
      setTime(day, {
        hours: 17,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      }).toISOString(),
    );
  }

  async function submit(publish: boolean) {
    const found = validateRfqForm(values, now);
    setErrors(found);
    if (hasErrors(found)) {
      showError(
        "Some fields need attention",
        "Check the fields marked in red and try again.",
      );
      return;
    }

    setBusy(publish ? "publish" : "draft");
    try {
      // 1. Save the RFQ itself.
      const payload = toRfqPayload(values);
      const saved = draftId
        ? await rfqService.update(draftId, payload)
        : await rfqService.create(payload);
      setDraftId(saved.id);

      // 2. Upload the files that were just added. Only the ones that failed stay in the list.
      const failed = await attachmentService.uploadEach(files, (file) =>
        attachmentService.uploadToRfq(saved.id, file),
      );
      setFiles((current) =>
        current.filter((file) => failed.includes(file.name)),
      );
      if (failed.length > 0)
        showError("Some files were not uploaded", failed.join(", "));

      // 3. Publish when asked; otherwise it stays as it is (a draft, or an open RFQ that was just edited).
      if (isOpen) {
        success("RFQ updated", "Vendors see the changes straight away.");
      } else if (publish) {
        await rfqService.publish(saved.id);
        success("RFQ published", "Vendors can now see it and submit quotes.");
      } else {
        info("Draft saved", "You can keep editing it until you publish.");
      }
      onSaved();
    } catch (caught) {
      showError(
        publish ? "Could not publish the RFQ" : "Could not save the RFQ",
        getErrorMessage(caught),
      );
      setBusy(null);
    }
  }

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
    >
      <div className="flex-1 overflow-y-auto px-5 py-2">
        <FormSection
          title="The request"
          description="What vendors will see first. Be specific; clear requests get better quotes."
        >
          <FormField
            label="Title"
            htmlFor="rfq-title"
            required
            error={errors.title}
          >
            <Input
              id="rfq-title"
              value={values.title}
              maxLength={200}
              placeholder="e.g. Office supplies for Hyderabad site"
              aria-invalid={!!errors.title}
              onChange={(event) => set("title", event.target.value)}
              className="h-10 bg-card"
            />
          </FormField>

          <FormField
            label="Category"
            htmlFor="rfq-category"
            required
            error={errors.category}
          >
            <SearchSelect
              id="rfq-category"
              value={values.category || null}
              options={RFQ_CATEGORY_OPTIONS}
              placeholder="Choose a category"
              searchPlaceholder="Search categories"
              invalid={!!errors.category}
              onChange={(option) => set("category", option?.value ?? "")}
              className="sm:w-72"
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="rfq-description"
            required
            error={errors.description}
            hint="Quality, brands, delivery conditions, anything a vendor needs to price this."
          >
            <Textarea
              id="rfq-description"
              value={values.description}
              rows={5}
              maxLength={5000}
              aria-invalid={!!errors.description}
              onChange={(event) => set("description", event.target.value)}
              className="bg-card"
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Line items"
          description="Vendors price each line separately. The total is calculated for them."
        >
          {lineItemsLocked && (
            <p className="rounded-sm border border-amber/30 bg-amber-soft px-3 py-2 text-[0.8125rem] text-ink">
              Vendors have already quoted, so the line items can no longer be
              changed.
            </p>
          )}
          <LineItemsEditor
            items={values.lineItems}
            onChange={(items) => set("lineItems", items)}
            errors={errors.lineItems}
            disabled={lineItemsLocked}
          />
          {errors.lineItemsSummary && (
            <p role="alert" className="text-[0.75rem] text-rust">
              {errors.lineItemsSummary}
            </p>
          )}
        </FormSection>

        <FormSection
          title="Delivery"
          description="Where the goods or service must be delivered."
        >
          <AddressFields
            idPrefix="delivery"
            value={values.address}
            onChange={(address) => set("address", address)}
            errors={errors.address}
          />
        </FormSection>

        <FormSection
          title="Budget and deadline"
          description="Vendors can revise their quotes until the deadline. After it, nothing can change."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Budget"
              htmlFor="rfq-budget"
              hint="Optional. Shown to vendors as a guide."
              error={errors.budget}
            >
              <MoneyInput
                id="rfq-budget"
                value={values.budget}
                onChange={(budget) => set("budget", budget)}
                placeholder="e.g. 400000"
                invalid={!!errors.budget}
              />
            </FormField>

            <FormField
              label="Submission deadline"
              htmlFor="rfq-deadline"
              required
              error={errors.deadline}
              hint={
                values.deadline
                  ? undefined
                  : "Pick a date and time, or use a shortcut."
              }
            >
              <DateTimePicker
                id="rfq-deadline"
                mode={PickerMode.DATETIME}
                value={values.deadline}
                onChange={(deadline) => set("deadline", deadline)}
                min={new Date(now)}
                placeholder="Select date and time"
                invalid={!!errors.deadline}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-small text-ink-3">Shortcut:</span>
            {QUICK_DEADLINES.map((option) => (
              <Button
                key={option.days}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickDeadline(option.days)}
              >
                {option.label}, 5:00 PM
              </Button>
            ))}
          </div>
          {values.deadline && (
            <p className="t-small text-ink-2">
              Closes {formatDateTime(values.deadline)}
            </p>
          )}
        </FormSection>

        <FormSection
          title="Specification files"
          description="PDF or XLSX. Vendors can download them from the RFQ page."
        >
          {existingFiles.length > 0 && (
            <AttachmentList
              attachments={existingFiles}
              canRemove={() => true}
              onRemoved={(removed) =>
                setExistingFiles((current) =>
                  current.filter((file) => file.id !== removed.id),
                )
              }
            />
          )}
          <FileUploader
            files={files}
            onChange={setFiles}
            maxFiles={Math.max(0, 10 - existingFiles.length)}
            disabled={busy !== null}
          />
        </FormSection>
      </div>

      <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-b-xl bg-card px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy !== null}
        >
          Cancel
        </Button>
        {isOpen ? (
          <Button type="submit" disabled={busy !== null}>
            {busy === "draft" && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        ) : (
          <>
            <Button type="submit" variant="outline" disabled={busy !== null}>
              {busy === "draft" && <Loader2 className="size-4 animate-spin" />}
              Save draft
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => void submit(true)}
            >
              {busy === "publish" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Publish RFQ
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  );
}
