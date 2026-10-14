import type { LineItem } from "@/types/rfq";
import { formatQuantity } from "@/utils/general";

/** What was asked for, as a plain table. Quantities are right-aligned figures. */
export function LineItemsTable({ items }: { items: LineItem[] }) {
  return (
    <div className="overflow-hidden rounded-sm border bg-card">
      <table className="w-full text-left">
        <thead>
          <tr className="t-caption border-b bg-sunken">
            <th className="w-10 px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Quantity</th>
            <th className="w-24 px-3 py-2 font-medium">Unit</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="t-figure px-3 py-2.5 text-[0.8125rem] text-ink-3">
                {index + 1}
              </td>
              <td className="px-3 py-2.5 text-[0.875rem] text-ink">
                {item.name}
              </td>
              <td className="t-figure px-3 py-2.5 text-right text-[0.875rem] text-ink">
                {formatQuantity(item.quantity)}
              </td>
              <td className="px-3 py-2.5 text-[0.8125rem] text-ink-2">
                {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
