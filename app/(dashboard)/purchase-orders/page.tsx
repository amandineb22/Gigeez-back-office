import { getAllPurchaseOrders } from "@/lib/data/purchaseOrders";
import { deletePurchaseOrder, receivePurchaseOrder } from "@/lib/actions/purchaseOrders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LinkButton, Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function PurchaseOrdersPage() {
  const orders = await getAllPurchaseOrders();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Purchase orders</h1>
        <LinkButton href="/purchase-orders/new" size="sm">
          Add purchase order
        </LinkButton>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No purchase orders yet"
          description="Create a purchase order to track incoming stock from your suppliers."
          actionLabel="Add purchase order"
          actionHref="/purchase-orders/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Expected</Th>
                <Th>Product / SKU</Th>
                <Th>Supplier</Th>
                <Th>Qty</Th>
                <Th>Unit cost</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {orders.map((po) => (
                <Tr key={po.id}>
                  <Td className="whitespace-nowrap">{po.expected_date ? formatDate(po.expected_date) : "—"}</Td>
                  <Td>
                    {po.variant.product.name}{" "}
                    <span className="font-mono text-xs text-ink/40">
                      ({po.variant.sku})
                    </span>
                  </Td>
                  <Td>{po.supplier?.name ?? "—"}</Td>
                  <Td>{po.quantity_ordered}</Td>
                  <Td>{formatCurrency(po.unit_cost)}</Td>
                  <Td className="font-medium text-ink">{formatCurrency(po.unit_cost * po.quantity_ordered)}</Td>
                  <Td>
                    {po.received ? (
                      <Badge variant="success">Received{po.received_at ? ` ${formatDate(po.received_at.slice(0, 10))}` : ""}</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {!po.received && (
                        <form action={receivePurchaseOrder.bind(null, po.id)}>
                          <Button type="submit" variant="secondary" size="sm">
                            Mark received
                          </Button>
                        </form>
                      )}
                      <LinkButton href={`/purchase-orders/${po.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deletePurchaseOrder.bind(null, po.id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this purchase order?">Delete</ConfirmSubmitButton>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
