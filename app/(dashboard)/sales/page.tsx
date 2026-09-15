import { getSalesInRange, getUnknownDateSales } from "@/lib/data/sales";
import { deleteSale } from "@/lib/actions/sales";
import { parseDateRangeParams } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SalesTable } from "@/components/sales/SalesTable";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseDateRangeParams(await searchParams);
  const [sales, unknownDateSales] = await Promise.all([getSalesInRange(range), getUnknownDateSales()]);

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
          <SalesTable sales={sales} deleteSale={deleteSale} />
        </Card>
      )}

      {unknownDateSales.length > 0 && (
        <Card className="p-0">
          <div className="p-5 pb-0">
            <CardHeader className="mb-1">
              <CardTitle>Sold — date unknown ({unknownDateSales.length})</CardTitle>
            </CardHeader>
            <p className="mb-4 text-sm text-ink/50">
              Pieces from the imported stock sheet that were already marked &ldquo;sold&rdquo;, with no recorded sale
              date or channel. They show here regardless of the date range above — edit one to fill in the real
              date/channel once you know it.
            </p>
          </div>
          <SalesTable sales={unknownDateSales} deleteSale={deleteSale} />
        </Card>
      )}
    </div>
  );
}
