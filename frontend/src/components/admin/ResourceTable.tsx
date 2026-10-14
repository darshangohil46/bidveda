import { ArrowDown, ArrowUp, Eye, Pencil, Trash2 } from "lucide-react";
import { CellValue } from "@/components/admin/CellValue";
import { Button } from "@/components/ui/button";
import type { AdminSort } from "@/lib/admin-sort";
import { cn } from "@/lib/utils";
import type { FieldMeta, ResourceRow } from "@/types/admin";
import { FieldType, SortOrder } from "@/types/enums";

/** Columns of these types have no sensible order, so their headings are not clickable. */
const UNSORTABLE = new Set<FieldType>([
  FieldType.FK,
  FieldType.PASSWORD,
  FieldType.JSON,
  FieldType.ARRAY,
]);

interface ResourceTableProps {
  columns: FieldMeta[];
  rows: ResourceRow[];
  sort: AdminSort | null;
  onSort: (field: FieldMeta) => void;
  /** True when the admin may change records; the row action is then "Edit" instead of "View". */
  canUpdate: boolean;
  canDelete: boolean;
  onOpen: (row: ResourceRow) => void;
  onDelete: (row: ResourceRow) => void;
  /** Dims the table while the next page is loading. */
  loading: boolean;
}

/** The records of one table. A click on a row opens it; the buttons at the end edit or delete it. */
export function ResourceTable({
  columns,
  rows,
  sort,
  onSort,
  canUpdate,
  canDelete,
  onOpen,
  onDelete,
  loading,
}: ResourceTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-sm border bg-card transition-opacity",
        loading && "opacity-60",
      )}
    >
      <table className="w-full min-w-160 border-collapse text-left">
        <thead>
          <tr className="t-caption border-b bg-sunken">
            {columns.map((field) => (
              <th
                key={field.name}
                scope="col"
                className="px-4 py-2.5 font-medium whitespace-nowrap"
              >
                {UNSORTABLE.has(field.type) ? (
                  field.label
                ) : (
                  <button
                    type="button"
                    onClick={() => onSort(field)}
                    className="inline-flex items-center gap-1 hover:text-ink"
                    aria-label={`Sort by ${field.label}`}
                  >
                    {field.label}
                    {sort?.by === field.name &&
                      (sort.order === SortOrder.ASC ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      ))}
                  </button>
                )}
              </th>
            ))}
            <th scope="col" className="w-28 px-4 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer transition-colors hover:bg-sunken/60"
              onClick={() => onOpen(row)}
            >
              {columns.map((field) => (
                <td
                  key={field.name}
                  className="px-4 py-3 text-[0.8125rem] text-ink"
                >
                  <CellValue field={field} value={row[field.name]} />
                </td>
              ))}
              <td className="px-2 py-1.5">
                {/* The buttons must not also trigger the row's own click. */}
                <div
                  className="flex justify-end gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={canUpdate ? "Edit" : "View"}
                    onClick={() => onOpen(row)}
                  >
                    {canUpdate ? (
                      <Pencil className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="size-4 text-rust" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
