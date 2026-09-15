import { notFound } from "next/navigation";
import { getProductWithVariants } from "@/lib/data/products";
import { deleteVariant } from "@/lib/actions/variants";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProductWithVariants(id);
  if (!data) notFound();
  const { product, variants } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{product.name}</h1>
          <p className="mt-1 text-sm text-ink/50">
            {product.category} · Base cost {formatCurrency(product.base_cost)}/unit
          </p>
          {product.notes && <p className="mt-2 max-w-xl text-sm text-ink/60">{product.notes}</p>}
        </div>
        <LinkButton href={`/products/${id}/edit`} variant="secondary" size="sm">
          Edit product
        </LinkButton>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-0">
          <CardHeader className="mb-0 flex-1">
            <CardTitle>SKUs (size / color)</CardTitle>
          </CardHeader>
          <LinkButton href={`/products/${id}/variants/new`} size="sm" className="mb-4">
            Add SKU
          </LinkButton>
        </div>

        {variants.length === 0 ? (
          <div className="p-5 pt-0">
            <EmptyState
              title="No SKUs yet"
              description="Add a size/color variant to start tracking stock and selling this product."
              actionLabel="Add SKU"
              actionHref={`/products/${id}/variants/new`}
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>SKU</Th>
                <Th>Size</Th>
                <Th>Color</Th>
                <Th>Length / Style / Material</Th>
                <Th>Retail price</Th>
                <Th>Stock</Th>
                <Th>Reorder point</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {variants.map((v) => (
                <Tr key={v.id}>
                  <Td className="font-mono text-xs text-ink/70">{v.sku}</Td>
                  <Td>{v.size}</Td>
                  <Td>{v.color}</Td>
                  <Td className="whitespace-nowrap text-xs text-ink/60">
                    {[v.length, v.style, v.material].filter(Boolean).join(" · ") || "—"}
                  </Td>
                  <Td>{v.retail_price != null ? formatCurrency(v.retail_price) : "—"}</Td>
                  <Td>
                    {v.stock_quantity}
                    {v.stock_quantity <= v.reorder_point && (
                      <Badge variant="warning" className="ml-2">
                        Low
                      </Badge>
                    )}
                  </Td>
                  <Td>{v.reorder_point}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton href={`/products/${id}/variants/${v.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deleteVariant.bind(null, v.id, id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this SKU?">Delete</ConfirmSubmitButton>
                      </form>
                    </div>
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
