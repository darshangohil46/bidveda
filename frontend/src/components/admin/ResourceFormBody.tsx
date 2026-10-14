"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CellValue } from "@/components/admin/CellValue";
import { DynamicField } from "@/components/admin/DynamicField";
import { PermissionMatrixEditor } from "@/components/admin/PermissionMatrixEditor";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/baseApi";
import { buildPayload, initialValues, splitFields } from "@/lib/resource-form";
import { cn } from "@/lib/utils";
import { adminService } from "@/services/admin.service";
import type {
  FieldMeta,
  PermissionMatrix,
  ResourceMeta,
  ResourceRow,
} from "@/types/admin";
import { FieldType, FormMode, ResourceKey } from "@/types/enums";
import { getErrorMessage } from "@/utils/general";

/** Values the admin cannot change (dates, counters) listed under the inputs. Structured data gets the full width. */
function ReadOnlyDetails({
  fields,
  record,
  spaced,
}: {
  fields: FieldMeta[];
  record: ResourceRow | null;
  spaced: boolean;
}) {
  return (
    <dl className={cn("grid gap-3", spaced && "mt-2 border-t pt-4")}>
      {fields.map((field) => {
        const wide =
          field.type === FieldType.JSON || field.type === FieldType.ARRAY;
        return (
          <div
            key={field.name}
            className={cn(
              "gap-3 text-[0.8125rem]",
              wide ? "grid" : "grid grid-cols-[8.5rem_minmax(0,1fr)]",
            )}
          >
            <dt className="text-ink-3">{field.label}</dt>
            <dd className="min-w-0 text-ink">
              <CellValue field={field} value={record?.[field.name]} expanded />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

interface ResourceFormBodyProps {
  meta: ResourceMeta;
  allResources: ResourceMeta[];
  mode: FormMode;
  /** The saved record when editing or viewing; null when creating. */
  record: ResourceRow | null;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * The inputs of the create / edit modal. Rendered only once the record is loaded, so every input
 * starts from real values.
 *
 * How it works: one input per editable field (chosen by the field's type), a permission table for
 * roles, and the read-only values below. Saving sends the values to the API; if the API rejects
 * some fields, its messages are shown under those inputs.
 */
export function ResourceFormBody({
  meta,
  allResources,
  mode,
  record,
  onSaved,
  onCancel,
}: ResourceFormBodyProps) {
  const { success, error } = useToast();
  const isRole = meta.key === ResourceKey.ADMIN_ROLES;
  const readOnly =
    mode === FormMode.VIEW || (isRole && record?.isSystem === true);
  const { editable, shown } = splitFields(meta, mode);

  const [values, setValues] = useState(() => initialValues(meta, record));
  const [matrix, setMatrix] = useState<PermissionMatrix>(
    () => (record?.permissions as PermissionMatrix | undefined) ?? {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const payload = buildPayload(editable, values);
      if (isRole) payload.permissions = matrix;

      if (mode === FormMode.CREATE)
        await adminService.create(meta.key, payload);
      else if (record) await adminService.update(meta.key, record.id, payload);
      success(
        mode === FormMode.CREATE
          ? `${meta.label} created`
          : `${meta.label} saved`,
      );
      onSaved();
    } catch (caught) {
      if (
        caught instanceof ApiError &&
        Object.keys(caught.fieldErrors).length > 0
      ) {
        setFieldErrors(caught.fieldErrors);
        error("Check the highlighted fields", caught.message);
      } else {
        error(
          `Could not save the ${meta.label.toLowerCase()}`,
          getErrorMessage(caught),
        );
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
        {isRole && record?.isSystem === true && (
          <p className="rounded-sm border border-amber/30 bg-amber-soft px-3 py-2 text-[0.8125rem] text-ink">
            This is a system role. It always has full access and cannot be
            changed.
          </p>
        )}

        {editable.map((field) => (
          <DynamicField
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(next) =>
              setValues((current) => ({ ...current, [field.name]: next }))
            }
            error={fieldErrors[field.name]}
            disabled={readOnly}
            editing={mode === FormMode.EDIT}
          />
        ))}

        {isRole && (
          <div className="grid gap-1.5">
            <p className="text-[0.8125rem] font-medium text-ink">Permissions</p>
            <PermissionMatrixEditor
              resources={allResources}
              value={matrix}
              onChange={setMatrix}
              disabled={readOnly}
            />
          </div>
        )}

        {mode !== FormMode.CREATE && shown.length > 0 && (
          <ReadOnlyDetails
            fields={shown}
            record={record}
            spaced={editable.length > 0 || isRole}
          />
        )}
      </div>

      <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-b-xl bg-card px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {mode === FormMode.CREATE
              ? `Create ${meta.label.toLowerCase()}`
              : "Save changes"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
