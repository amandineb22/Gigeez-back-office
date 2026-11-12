import { getInventory, getKnownLocations, DEMO_PRODUCT_NAMES } from "@/lib/data/inventory";
import { AddStockForm, type SkuOption } from "./AddStockForm";

export default async function AddStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const variantParam = typeof params.variant === "string" ? params.variant : undefined;
  const [inventory, locations] = await Promise.all([getInventory(), getKnownLocations()]);

  const skus: SkuOption[] = inventory
    .filter((row) => !DEMO_PRODUCT_NAMES.has(row.product_name))
    .map((row) => {
      const attrs = [row.length, row.style, row.material].filter(Boolean).join(" · ");
      return {
        variant_id: row.variant_id,
        product_name: row.product_name,
        label: `${row.size} / ${row.color}${attrs ? ` · ${attrs}` : ""} — ${row.sku} (${row.stock_quantity} in stock)`,
      };
    });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-ink">Add stock</h1>
      <p className="mb-6 text-sm text-ink/50">Record new pieces that have arrived, and where they are.</p>
      <AddStockForm skus={skus} locations={locations} defaultVariantId={variantParam} />
    </div>
  );
}
