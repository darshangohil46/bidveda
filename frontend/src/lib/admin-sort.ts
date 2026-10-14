import { SortOrder } from "@/types/enums";

export interface AdminSort {
  by: string;
  order: SortOrder;
}

/** What a click on a column heading does: sort it ascending, then descending, then back to the default order. */
export function nextAdminSort(
  current: AdminSort | null,
  column: string,
): AdminSort | null {
  if (current?.by !== column) return { by: column, order: SortOrder.ASC };
  if (current.order === SortOrder.ASC)
    return { by: column, order: SortOrder.DESC };
  return null;
}
