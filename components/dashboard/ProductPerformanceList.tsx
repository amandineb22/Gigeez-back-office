import { formatCurrency } from "@/lib/utils";
import type { ProductPerformance } from "@/lib/calculations";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";

export function ProductPerformanceList({
  title,
  items,
  emptyLabel,
  currency = BASE_CURRENCY,
}: {
  title: string;
  items: ProductPerformance[];
  emptyLabel: string;
  currency?: Currency;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-ink/60">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink/40">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((p) => (
            <li key={p.product_id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{p.product_name}</p>
                <p className="text-xs text-ink/40">{p.unitsSold} units sold</p>
              </div>
              <p className="shrink-0 font-medium text-ink/80">{formatCurrency(p.revenue, currency)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
