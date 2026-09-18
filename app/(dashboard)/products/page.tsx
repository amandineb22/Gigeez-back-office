import { getAllProducts } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currency = parseCurrencyParam(await searchParams);
  const products = await getAllProducts();
  const supabase = await createClient();
  const { data: variants } = await supabase.from("variants").select("product_id, stock_quantity");

  const statsByProduct = new Map<string, { skuCount: number; totalStock: number }>();
  for (const v of variants ?? []) {
    const row = statsByProduct.get(v.product_id) ?? { skuCount: 0, totalStock: 0 };
    row.skuCount += 1;
    row.totalStock += v.stock_quantity;
    statsByProduct.set(v.product_id, row);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Products</h1>
        <LinkButton href="/products/new" size="sm">
          Add product
        </LinkButton>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product, then attach size/color SKUs to it."
          actionLabel="Add product"
          actionHref="/products/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Base cost</Th>
                <Th>SKUs</Th>
                <Th>Total stock</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {products.map((p) => {
                const stats = statsByProduct.get(p.id) ?? { skuCount: 0, totalStock: 0 };
                return (
                  <Tr key={p.id}>
                    <Td className="font-medium text-ink">{p.name}</Td>
                    <Td>{p.category}</Td>
                    <Td>{formatCurrency(p.base_cost, currency)}</Td>
                    <Td>{stats.skuCount}</Td>
                    <Td>{stats.totalStock}</Td>
                    <Td>
                      <LinkButton href={`/products/${p.id}`} variant="ghost" size="sm">
                        View
                      </LinkButton>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
