import { getSalesInRange, getUnknownDateSales } from "@/lib/data/sales";
import { deleteSale } from "@/lib/actions/sales";
import { parseDateRangeParams } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
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
  // Dated sales (in range) first, then sold pieces with no recorded date — shown
  // together as one list rather than split, so "Sales" always shows everything sold.
  const allSales = [...sales, ...unknownDateSales];

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

      {allSales.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="Log a sale to start tracking revenue and profit."
          actionLabel="Add sale"
          actionHref="/sales/new"
        />
      ) : (
        <Card className="p-0">
          <SalesTable sales={allSales} deleteSale={deleteSale} />
        </Card>
      )}
    </div>
  );
}
