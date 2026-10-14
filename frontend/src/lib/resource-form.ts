import type {
  FieldMeta,
  FkValue,
  ResourceMeta,
  ResourceRow,
} from "@/types/admin";
import { FieldType, FormMode } from "@/types/enums";

/*
 * Small rules behind the admin's create / edit form, with no React in it.
 * The form is built from the field list the backend declares for each table.
 */

/** The fields the form shows, split in two: inputs the admin can fill in, and values shown read-only. */
export function splitFields(
  meta: ResourceMeta,
  mode: FormMode,
): { editable: FieldMeta[]; shown: FieldMeta[] } {
  return {
    // A field marked `immutable` can be set when creating a record but not changed afterwards.
    editable: meta.fields.filter(
      (field) =>
        !field.readonly && !(mode === FormMode.EDIT && field.immutable),
    ),
    shown: meta.fields.filter(
      (field) => field.readonly && field.name !== "id" && !field.secret,
    ),
  };
}

/** What one input starts with: the saved value, else the table's default, else empty (or off). */
function initialValue(field: FieldMeta, record: ResourceRow | null): unknown {
  const stored = record?.[field.name];
  if (stored !== undefined && stored !== null) return stored;
  if (field.defaultValue !== undefined) return field.defaultValue;
  return field.type === FieldType.BOOLEAN ? false : "";
}

export function initialValues(
  meta: ResourceMeta,
  record: ResourceRow | null,
): Record<string, unknown> {
  const inputs = meta.fields.filter((field) => !field.readonly);
  return Object.fromEntries(
    inputs.map((field) => [field.name, initialValue(field, record)]),
  );
}

/** What is sent to the API: a password only when one was typed, a foreign key as just its id. */
export function buildPayload(
  fields: FieldMeta[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === FieldType.PASSWORD) {
      if (typeof value === "string" && value) payload[field.name] = value;
    } else if (field.type === FieldType.FK) {
      payload[field.name] = (value as FkValue | null)?.id ?? null;
    } else {
      payload[field.name] = value;
    }
  }
  return payload;
}
