import { getSalesInRange } from "@/lib/data/sales";
import { deleteSale } from "@/lib/actions/sales";
import { parseDateRangeParams, formatCurrency, formatDate, toTitleCase, cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseDateRangeParams(await searchParams);
  const sales = await getSalesInRange(range);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Sales</h1>
        <div className="flex gap-2">
          <LinkButton
            href={`/api/export/sales?from=${range.from}&to=${range.to}`}
            variant="secondary"
            size="sm"
          >
            Export CSV
          </LinkButton>
          <LinkButton href="/sales/new" size="sm">
            Add sale
          </LinkButton>
        </div>
      </div>

      {sales.length === 0 ? (
        <EmptyState
          title="No sales in this range"
          description="Log a sale to start tracking revenue and profit."
          actionLabel="Add sale"
          actionHref="/sales/new"
        />
      ) : (
        <Card className="p-0">
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
              {sales.map((s) => (
                <Tr key={s.id}>
                  <Td className="whitespace-nowrap">{formatDate(s.sale_date)}</Td>
                  <Td>{s.product_name}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-ink/60">
                    {s.sku} <span className="text-ink/40">({s.size}/{s.color})</span>
                  </Td>
                  <Td>{s.quantity}</Td>
                  <Td>{formatCurrency(s.unit_price)}</Td>
                  <Td>
                    <Badge variant="neutral">{toTitleCase(s.channel)}</Badge>
                    {s.is_refund && (
                      <Badge variant="danger" className="ml-1.5">
                        Refund
                      </Badge>
                    )}
                  </Td>
                  <Td className={cn("font-medium", s.revenue < 0 ? "text-red-600" : "text-ink")}>
                    {formatCurrency(s.revenue)}
                  </Td>
                  <Td className={cn("font-medium", s.profit < 0 ? "text-red-600" : "text-emerald-700")}>
                    {formatCurrency(s.profit)}
                  </Td>
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
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
