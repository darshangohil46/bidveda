"use client";

import { DateTimePicker } from "@/components/common/DateTimePicker";
import { FormField } from "@/components/common/FormField";
import { PhoneField } from "@/components/common/PhoneField";
import { SearchSelect } from "@/components/common/SearchSelect";
import { FkSelect } from "@/components/admin/FkSelect";
import { ImageField } from "@/components/admin/ImageField";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldType, PickerMode } from "@/types/enums";
import { toOptions } from "@/lib/options";
import type { FieldMeta, FkValue } from "@/types/admin";

interface DynamicFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  /** Editing an existing record: passwords may be left blank. */
  editing?: boolean;
}

/** One form control chosen purely from the field's declared type. */
export function DynamicField({
  field,
  value,
  onChange,
  error,
  disabled,
  editing,
}: DynamicFieldProps) {
  const id = `field-${field.name}`;
  const invalid = !!error;
  const text = value === null || value === undefined ? "" : String(value);

  const control = (() => {
    switch (field.type) {
      case FieldType.BOOLEAN:
        return (
          <div className="flex items-center gap-3 py-1.5">
            <Switch
              id={id}
              checked={value === true}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <span className="text-[0.8125rem] text-ink-2">
              {value === true ? "On" : "Off"}
            </span>
          </div>
        );
      case FieldType.IMAGE:
        return (
          <ImageField
            id={id}
            label={field.label}
            value={value}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
          />
        );
      case FieldType.TEXT:
        return (
          <Textarea
            id={id}
            value={text}
            rows={4}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className="bg-card"
          />
        );
      case FieldType.JSON:
        return (
          <Textarea
            id={id}
            value={
              typeof value === "string"
                ? value
                : value
                  ? JSON.stringify(value, null, 2)
                  : ""
            }
            rows={6}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className="bg-card font-mono text-[0.75rem]"
          />
        );
      case FieldType.DATE:
        return (
          <DateTimePicker
            id={id}
            mode={PickerMode.DATE}
            value={text || null}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
          />
        );
      case FieldType.TIME:
        return (
          <DateTimePicker
            id={id}
            mode={PickerMode.TIME}
            value={text || null}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
          />
        );
      case FieldType.DATETIME:
        return (
          <DateTimePicker
            id={id}
            mode={PickerMode.DATETIME}
            value={text || null}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
          />
        );
      case FieldType.ENUM:
        return (
          <SearchSelect
            id={id}
            value={text || null}
            options={toOptions(field.enumValues ?? [])}
            placeholder="Select"
            disabled={disabled}
            invalid={invalid}
            clearable={!field.required}
            onChange={(option) => onChange(option?.value ?? "")}
          />
        );
      case FieldType.FK:
        return field.fk ? (
          <FkSelect
            id={id}
            resource={field.fk.resource}
            value={(value as FkValue | null) ?? null}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
            clearable={!field.required}
          />
        ) : null;
      case FieldType.ARRAY:
        return (
          <Input
            id={id}
            value={Array.isArray(value) ? value.join(", ") : text}
            disabled={disabled}
            placeholder="Comma-separated values"
            onChange={(event) =>
              onChange(
                event.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              )
            }
            className="h-9 bg-card"
          />
        );
      case FieldType.PHONE:
        return (
          <PhoneField
            id={id}
            value={text}
            onChange={onChange}
            disabled={disabled}
            invalid={invalid}
          />
        );
      case FieldType.PASSWORD:
        return (
          <Input
            id={id}
            type="password"
            value={text}
            autoComplete="new-password"
            disabled={disabled}
            aria-invalid={invalid}
            placeholder={
              editing ? "Leave blank to keep the current password" : undefined
            }
            onChange={(event) => onChange(event.target.value)}
            className="h-9 bg-card"
          />
        );
      case FieldType.NUMBER:
      case FieldType.DECIMAL:
        return (
          <Input
            id={id}
            value={text}
            inputMode={field.type === FieldType.NUMBER ? "numeric" : "decimal"}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className="t-figure h-9 bg-card"
          />
        );
      default:
        return (
          <Input
            id={id}
            type={field.type === FieldType.EMAIL ? "email" : "text"}
            value={text}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 bg-card"
          />
        );
    }
  })();

  return (
    <FormField
      label={field.label}
      htmlFor={id}
      required={
        field.required && !(editing && field.type === FieldType.PASSWORD)
      }
      hint={field.hint}
      error={error}
    >
      {control}
    </FormField>
  );
}
