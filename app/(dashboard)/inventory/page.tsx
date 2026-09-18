import { getInventory, getStockUnits } from "@/lib/data/inventory";
import { getAllSales, getSalesInRange } from "@/lib/data/sales";
import { parseDateRangeParams, formatCurrency } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { calculateInventoryValue, lowStockItems, findDeadStock } from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StockTable, type StockRow } from "@/components/inventory/StockTable";

const DEAD_STOCK_THRESHOLD_DAYS = 60;

// Sample/demo products from the app's seed script (npm run seed) — not part
// of the real Gigeez stock sheet. Hidden here rather than deleted, so
// nothing is lost if a database still has them.
const DEMO_PRODUCT_NAMES = new Set([
  "Linen Wrap Dress",
  "Organic Cotton Tee",
  "Tailored Wool Trousers",
  "Quilted Field Jacket",
  "Woven Leather Belt",
]);

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = parseDateRangeParams(params);
  const currency = parseCurrencyParam(params);
  const [inventoryRaw, stockUnits, allSales, salesInRange] = await Promise.all([
    getInventory(),
    getStockUnits(),
    getAllSales(),
    getSalesInRange(range),
  ]);
  const inventory = inventoryRaw.filter((row) => !DEMO_PRODUCT_NAMES.has(row.product_name));

  const inventoryValue = calculateInventoryValue(inventory);
  const lowStock = lowStockItems(inventory);

  const lastSaleDateByVariant = new Map<string, string>();
  for (const s of allSales) {
    if (s.is_refund || !s.sale_date) continue;
    const existing = lastSaleDateByVariant.get(s.variant_id);
    if (!existing || s.sale_date > existing) lastSaleDateByVariant.set(s.variant_id, s.sale_date);
  }
  const deadStock = findDeadStock(inventory, lastSaleDateByVariant, DEAD_STOCK_THRESHOLD_DAYS);
  const deadStockIds = new Set(deadStock.map((d) => d.variant_id));

  const unitsSoldByVariant = new Map<string, number>();
  for (const s of salesInRange) {
    if (s.is_refund) continue;
    unitsSoldByVariant.set(s.variant_id, (unitsSoldByVariant.get(s.variant_id) ?? 0) + s.quantity);
  }

  // Where each variant's physical pieces currently sit — own warehouse (WHSE)
  // or a specific consignment boutique — so the Stock table can show exactly
  // where every dress is, not just a total count.
  const locationsByVariant = new Map<string, Record<string, number>>();
  for (const su of stockUnits) {
    const bucket = locationsByVariant.get(su.variant_id) ?? {};
    bucket[su.bin_location] = (bucket[su.bin_location] ?? 0) + 1;
    locationsByVariant.set(su.variant_id, bucket);
  }
  const stockRows: StockRow[] = inventory.map((row) => ({
    ...row,
    locations: locationsByVariant.get(row.variant_id) ?? {},
  }));

  if (inventory.length === 0) {
    return (
      <EmptyState
        title="No inventory yet"
        description="Add products and SKUs to start tracking stock levels and value."
        actionLabel="Add a product"
        actionHref="/products/new"
      />
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-ink">Stock</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Inventory value</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(inventoryValue, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Low stock SKUs</p>
          <p className="mt-2 font-display text-2xl text-ink">{lowStock.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Dead stock SKUs</p>
          <p className="mt-2 font-display text-2xl text-ink">{deadStock.length}</p>
          <p className="mt-1 text-xs text-ink/40">No sales in {DEAD_STOCK_THRESHOLD_DAYS}+ days</p>
        </Card>
      </div>

      <Card className="p-0">
        <StockTable rows={stockRows} deadStockIds={deadStockIds} unitsSoldByVariant={unitsSoldByVariant} />
      </Card>
    </div>
  );
}
