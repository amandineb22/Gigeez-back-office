import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKnownLocations, getVariantStockUnits } from "@/lib/data/inventory";
import { moveStock, removeOneAt } from "@/lib/actions/stock";
import { formatCurrency } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import type { InventoryRow } from "@/lib/types";
import { MoveStockForm } from "./MoveStockForm";

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

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/inventory" className="text-xs text-ink/40 hover:text-ink">
          ← Stock
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink">{sku.product_name}</h1>
            <p className="mt-1 text-sm text-ink/50">
              {sku.size} / {sku.color}
              {attrs ? ` · ${attrs}` : ""}
              {sku.retail_price != null ? ` · ${formatCurrency(sku.retail_price, currency)}` : ""}
              <span className="ml-2 font-mono text-xs text-ink/40">{sku.sku}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/products/${sku.product_id}/variants/${variantId}/edit`} variant="secondary" size="sm">
              Edit price & details
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

      <Card className="space-y-5">
        {units.length === 0 ? (
          <p className="text-sm text-ink/50">None in stock.</p>
        ) : (
          <>
            <ul className="divide-y divide-ink/5">
              {Object.entries(byLocation).map(([loc, count]) => (
                <li key={loc} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium text-ink">{loc}</span>
                    <span className="ml-2 text-ink/50">
                      {count} piece{count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <form action={removeOneAt.bind(null, variantId, loc)}>
                    <ConfirmSubmitButton confirmMessage={`Remove 1 piece from ${loc}? Only for a mistake, a lost or damaged piece, or one already sold on the Sales page.`}>
                      Remove 1
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
            <MoveStockForm action={moveStock.bind(null, variantId)} currentLocations={byLocation} locations={locations} />
          </>
        )}
      </Card>
    </div>
  );
}
