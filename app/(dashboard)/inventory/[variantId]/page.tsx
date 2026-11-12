import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKnownLocations, getVariantStockUnits } from "@/lib/data/inventory";
import { moveStock, removeStockUnit, updateStockUnit } from "@/lib/actions/stock";
import { formatCurrency } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import type { InventoryRow } from "@/lib/types";
import { MoveStockForm } from "./MoveStockForm";
import { PieceForm } from "./PieceRow";

export default async function EditStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { variantId } = await params;
  const sp = await searchParams;
  const currency = parseCurrencyParam(sp);
  const added = typeof sp.added === "string" ? Number(sp.added) : 0;

  const supabase = await createClient();
  const { data: row } = await supabase.from("v_inventory").select("*").eq("variant_id", variantId).maybeSingle();
  if (!row) notFound();
  const sku = row as InventoryRow;

  const [units, locations] = await Promise.all([getVariantStockUnits(variantId), getKnownLocations()]);

  const byLocation: Record<string, number> = {};
  for (const u of units) byLocation[u.bin_location] = (byLocation[u.bin_location] ?? 0) + 1;
  const attrs = [sku.length, sku.style, sku.material].filter(Boolean).join(" · ");
  const mismatch = units.length !== sku.stock_quantity;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/inventory" className="text-xs text-ink/40 hover:text-ink">
          ← Stock
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink">{sku.product_name}</h1>
            <p className="mt-1 text-sm text-ink/50">
              <span className="font-mono text-xs">{sku.sku}</span> · {sku.size} / {sku.color}
              {attrs ? ` · ${attrs}` : ""}
              {sku.retail_price != null ? ` · ${formatCurrency(sku.retail_price, currency)}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton
              href={`/products/${sku.product_id}/variants/${variantId}/edit`}
              variant="secondary"
              size="sm"
            >
              Edit SKU details
            </LinkButton>
            <LinkButton href={`/inventory/new?variant=${variantId}`} size="sm">
              Add pieces
            </LinkButton>
          </div>
        </div>
      </div>

      {added > 0 && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Added {added} piece{added === 1 ? "" : "s"}.
        </p>
      )}

      {mismatch && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This SKU&apos;s stock count says {sku.stock_quantity}, but {units.length} piece
          {units.length === 1 ? " has" : "s have"} a location. Sales recorded on the Sales page lower the count
          without saying which piece sold, so remove the sold piece here to bring them back in line.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Where the pieces are</CardTitle>
        </CardHeader>
        {units.length === 0 ? (
          <p className="text-sm text-ink/50">No pieces in stock.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {Object.entries(byLocation).map(([loc, count]) => (
                <Badge key={loc} variant={loc === "WHSE" ? "brand" : "neutral"}>
                  {loc} × {count}
                </Badge>
              ))}
            </div>
            <MoveStockForm
              action={moveStock.bind(null, variantId)}
              currentLocations={byLocation}
              locations={locations}
            />
          </>
        )}
      </Card>

      <Card className="p-0">
        <div className="p-5 pb-0">
          <CardHeader className="mb-0">
            <CardTitle>Each piece</CardTitle>
          </CardHeader>
          <p className="mt-1 text-xs text-ink/40">Change one piece&apos;s location or add a note to it.</p>
        </div>
        {units.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No pieces in stock"
              description="Add pieces when new stock of this SKU arrives."
              actionLabel="Add pieces"
              actionHref={`/inventory/new?variant=${variantId}`}
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Location / note</Th>
                <Th>Added</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {units.map((u, i) => (
                <Tr key={u.stock_unit_id}>
                  <Td className="text-xs text-ink/40">{i + 1}</Td>
                  <Td>
                    <PieceForm
                      action={updateStockUnit.bind(null, u.stock_unit_id, variantId)}
                      unitId={u.stock_unit_id}
                      location={u.bin_location}
                      notes={u.notes}
                      locations={locations}
                    />
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-ink/40">{u.created_at.slice(0, 10)}</Td>
                  <Td>
                    <form action={removeStockUnit.bind(null, u.stock_unit_id, variantId)}>
                      <ConfirmSubmitButton confirmMessage="Remove this piece from stock? Use this for a piece entered by mistake, lost or damaged — record sales on the Sales page.">
                        Remove
                      </ConfirmSubmitButton>
                    </form>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
