import { JsonDetails } from "@/components/admin/JsonDetails";
import { StoredImage } from "@/components/admin/StoredImage";
import { FieldType } from "@/types/enums";
import type { FieldMeta, FkValue } from "@/types/admin";
import { formatDate, formatDateTime, formatMoney } from "@/utils/general";

const EMPTY = <span className="text-ink-3">-</span>;

/** Renders one value the way its declared type deserves. Used in tables and in the read-only detail view. */
export function CellValue({
  field,
  value,
  expanded,
}: {
  field: FieldMeta;
  value: unknown;
  expanded?: boolean;
}) {
  if (value === null || value === undefined || value === "") return EMPTY;

  switch (field.type) {
    case FieldType.BOOLEAN:
      return (
        <span className="inline-flex items-center gap-1.5 text-[0.8125rem]">
          <span
            aria-hidden
            className={`size-2 rounded-full ${value ? "bg-pine" : "bg-ink-3"}`}
          />
          {value ? "Yes" : "No"}
        </span>
      );
    case FieldType.DATETIME:
      return (
        <span className="t-figure text-[0.8125rem]">
          {formatDateTime(String(value))}
        </span>
      );
    case FieldType.DATE:
      return (
        <span className="t-figure text-[0.8125rem]">
          {formatDate(String(value))}
        </span>
      );
    case FieldType.FK:
      return <span>{(value as FkValue).label}</span>;
    case FieldType.IMAGE:
      return <StoredImage name={String(value)} alt={field.label} />;
    case FieldType.NUMBER:
    case FieldType.DECIMAL:
      // Amounts are stored in minor units; show them as money so nobody reads 35000000 as thirty-five million.
      return field.name.endsWith("Minor") ? (
        <span className="t-figure">{formatMoney(Number(value))}</span>
      ) : (
        <span className="t-figure">{String(value)}</span>
      );
    case FieldType.JSON:
    case FieldType.ARRAY:
      // The detail view shows everything; a table cell only has room for a one-line hint.
      if (expanded) return <JsonDetails value={value} />;
      return (
        <code className="block max-w-[18rem] truncate font-mono text-[0.75rem] text-ink-2">
          {JSON.stringify(value)}
        </code>
      );
    case FieldType.ENUM:
      return (
        <span className="rounded-sm border border-line-strong px-1.5 py-px text-[0.75rem]">
          {String(value)}
        </span>
      );
    default:
      return (
        <span className="block max-w-[22rem] truncate">{String(value)}</span>
      );
  }
}
