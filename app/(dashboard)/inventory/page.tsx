import { getInventory } from "@/lib/data/inventory";
import { getAllSales, getSalesInRange } from "@/lib/data/sales";
import { parseDateRangeParams, formatCurrency, cn } from "@/lib/utils";
import {
  calculateInventoryValue,
  lowStockItems,
  findDeadStock,
  sellThroughRate,
} from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const DEAD_STOCK_THRESHOLD_DAYS = 60;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseDateRangeParams(await searchParams);
  const [inventory, allSales, salesInRange] = await Promise.all([
    getInventory(),
    getAllSales(),
    getSalesInRange(range),
  ]);

  const inventoryValue = calculateInventoryValue(inventory);
  const lowStock = lowStockItems(inventory);

  const lastSaleDateByVariant = new Map<string, string>();
  for (const s of allSales) {
    if (s.is_refund) continue;
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
      <h1 className="font-display text-2xl text-ink">Inventory</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Inventory value</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(inventoryValue)}</p>
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
        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Size / Color</Th>
              <Th>Stock</Th>
              <Th>Reorder pt.</Th>
              <Th>Value</Th>
              <Th>Sell-through (range)</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {inventory.map((row) => {
              const unitsSold = unitsSoldByVariant.get(row.variant_id) ?? 0;
              const sellThrough = sellThroughRate(unitsSold, row.stock_quantity);
              return (
                <Tr key={row.variant_id}>
                  <Td className="font-medium text-ink">{row.product_name}</Td>
                  <Td className="font-mono text-xs text-ink/60">{row.sku}</Td>
                  <Td>
                    {row.size} / {row.color}
                  </Td>
                  <Td>{row.stock_quantity}</Td>
                  <Td>{row.reorder_point}</Td>
                  <Td>{formatCurrency(row.inventory_value)}</Td>
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
      </Card>
    </div>
  );
}
