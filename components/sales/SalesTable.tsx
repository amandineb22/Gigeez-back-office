"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate, toTitleCase, cn } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import type { SaleWithDetails } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

/** Short "Length/Style/Material" tag from the raw stock-sheet codes, e.g. "X · BF · VI". Omits blanks. */
function attributeTag(s: SaleWithDetails): string | null {
  const parts = [s.length, s.style, s.material].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function SalesTable({
  sales,
  deleteSale,
  searchPlaceholder = "Search by product or SKU…",
}: {
  sales: SaleWithDetails[];
  deleteSale: (id: string) => Promise<void>;
  searchPlaceholder?: string;
}) {
  const currency = useCurrency();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) => s.product_name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q) || s.color.toLowerCase().includes(q)
    );
  }, [sales, query]);

  if (sales.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {sales.length > 8 && (
        <div className="px-5 pt-5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-xs rounded-md border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No matching sales" description="Try a different search term." />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Date</Th>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Qty</Th>
              <Th>Unit price</Th>
              <Th>Channel</Th>
              <Th>Revenue</Th>
              <Th>Profit</Th>
              <Th />
            </tr>
          </Thead>
          <tbody>
            {filtered.map((s) => {
              const tag = attributeTag(s);
              return (
                <Tr key={s.id}>
                  <Td className="whitespace-nowrap">
                    {s.sale_date ? (
                      formatDate(s.sale_date)
                    ) : (
                      <Badge variant="neutral" title="No sale date was recorded for this piece">
                        Unknown
                      </Badge>
                    )}
                  </Td>
                  <Td>{s.product_name}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink/60">
                    {s.sku}{" "}
                    <span className="text-ink/40">
                      ({s.size}/{s.color}
                      {tag ? ` · ${tag}` : ""})
                    </span>
                    {s.sold_from && <div className="mt-0.5 font-sans text-[11px] text-ink/40">Sold from: {s.sold_from}</div>}
                  </Td>
                  <Td>{s.quantity}</Td>
                  <Td>{formatCurrency(s.unit_price, currency)}</Td>
                  <Td>
                    {s.channel === "unknown" ? (
                      <Badge variant="neutral" title="No sale channel was recorded for this piece">
                        Unknown
                      </Badge>
                    ) : (
                      <Badge variant="neutral">{toTitleCase(s.channel)}</Badge>
                    )}
                    {s.is_refund && (
                      <Badge variant="danger" className="ml-1.5">
                        Refund
                      </Badge>
                    )}
                  </Td>
                  <Td className={cn("font-medium", s.revenue < 0 ? "text-red-600" : "text-ink")}>{formatCurrency(s.revenue, currency)}</Td>
                  <Td className={cn("font-medium", s.profit < 0 ? "text-red-600" : "text-emerald-700")}>{formatCurrency(s.profit, currency)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton href={`/sales/${s.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deleteSale.bind(null, s.id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this sale? This will also adjust inventory back.">
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
