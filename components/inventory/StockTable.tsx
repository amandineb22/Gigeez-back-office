"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { sellThroughRate } from "@/lib/calculations";
import type { InventoryRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

export interface StockRow extends InventoryRow {
  /** bin_location -> count of physical pieces currently there. */
  locations: Record<string, number>;
}

/** Short "Length/Style/Material" tag from the raw stock-sheet codes, e.g. "X · BF · VI". Omits blanks. */
function attributeTag(row: StockRow): string | null {
  const parts = [row.length, row.style, row.material].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function StockTable({
  rows,
  deadStockIds,
  unitsSoldByVariant,
}: {
  rows: StockRow[];
  deadStockIds: Set<string>;
  unitsSoldByVariant: Map<string, number>;
}) {
  const currency = useCurrency();

  const [query, setQuery] = useState("");
  const [productName, setProductName] = useState<string>("all");

  const productNames = useMemo(() => {
    const set = new Set(rows.map((r) => r.product_name));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (productName !== "all") result = result.filter((r) => r.product_name === productName);
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          Object.keys(r.locations).some((loc) => loc.toLowerCase().includes(q))
      );
    }
    return result;
  }, [rows, productName, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by model, SKU, or location (e.g. WHSE, PARIS)…"
          className="w-full max-w-sm rounded-md border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <div className="flex flex-wrap gap-1.5">
          {productNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setProductName(name)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-editorial ${
                productName === name ? "bg-ink text-white" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              {name === "all" ? "All" : name}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-ink/40">
          {filtered.length} of {rows.length} SKUs
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="p-5 pt-0">
          <EmptyState title="No matching stock" description="Try a different search term or product filter." />
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU / attributes</Th>
              <Th>Locations</Th>
              <Th>Stock</Th>
              <Th>Retail price</Th>
              <Th>Sell-through (range)</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((row) => {
              const tag = attributeTag(row);
              const unitsSold = unitsSoldByVariant.get(row.variant_id) ?? 0;
              const sellThrough = sellThroughRate(unitsSold, row.stock_quantity);
              return (
                <Tr key={row.variant_id}>
                  <Td className="font-medium text-ink">
                    {row.product_name}
                    <div className="text-xs font-normal text-ink/40">{row.category}</div>
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink/60">
                    {row.sku}
                    <div className="font-sans text-[11px] text-ink/40">
                      {row.size}/{row.color}
                      {tag ? ` · ${tag}` : ""}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(row.locations).map(([loc, count]) => (
                        <Badge key={loc} variant={loc === "WHSE" ? "brand" : "neutral"}>
                          {loc} × {count}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>{row.stock_quantity}</Td>
                  <Td>{row.retail_price != null ? formatCurrency(row.retail_price, currency) : "—"}</Td>
                  <Td>{sellThrough.toFixed(0)}%</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {row.low_stock && <Badge variant="warning">Low stock</Badge>}
                      {deadStockIds.has(row.variant_id) && <Badge variant="danger">Dead stock</Badge>}
                      {!row.low_stock && !deadStockIds.has(row.variant_id) && <Badge variant="success">Healthy</Badge>}
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
