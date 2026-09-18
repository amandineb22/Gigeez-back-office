import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { FinancialsChart } from "@/components/charts/FinancialsChart";
import { MetricTile, type TileExplanation } from "@/components/dashboard/MetricTile";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";
import {
  summarizeFinancialMonths,
  targetProgress,
  yearOverYearChange,
  type FinancialYearTotals,
} from "@/lib/calculations";
import type { BpTarget, FinancialMonth } from "@/lib/types";

/** "Apr–Dec 2025", or "2025" when the whole year is covered. */
function describeSpan(totals: FinancialYearTotals): string {
  if (!totals.firstMonth || !totals.lastMonth) return `${totals.year}`;
  if (totals.monthsWithData >= 12) return `${totals.year}`;
  const from = format(parseISO(totals.firstMonth), "MMM");
  const to = format(parseISO(totals.lastMonth), "MMM");
  return from === to ? `${from} ${totals.year}` : `${from}–${to} ${totals.year}`;
}

/**
 * The financial year as the P&L spreadsheet records it.
 *
 * Deliberately its own section: these figures come from the accountant's
 * sheet, while the KPI cards above come from the piece-level `sales` and
 * `expenses` tables. The two describe the same business but are recorded
 * differently, so they are shown side by side and never added together.
 */
export function FinancialsSection({
  year,
  months,
  totals,
  previousTotals,
  target,
  currency = BASE_CURRENCY,
}: {
  year: number;
  months: FinancialMonth[];
  totals: FinancialYearTotals;
  previousTotals: FinancialYearTotals | null;
  target: BpTarget | null;
  currency?: Currency;
}) {
  const rows = summarizeFinancialMonths(months);
  const comparisonLabel = previousTotals ? describeSpan(previousTotals) : "last year";
  const change = (current: number, key: keyof FinancialYearTotals) =>
    previousTotals ? yearOverYearChange(current, previousTotals[key] as number) : null;

  const targetPct = target ? targetProgress(totals.revenue, target.revenue) : null;

  const span = describeSpan(totals);
  const money = (n: number) => formatCurrency(n, currency);
  // Called out by name in the units explanation: one big month skews the chart,
  // and saying which one up front is friendlier than leaving it to be noticed.
  const busiest = rows.reduce<(typeof rows)[number] | null>(
    (best, r) => (best === null || r.units > best.units ? r : best),
    null
  );

  const explanations: Record<"revenue" | "units" | "costs" | "cashNet", TileExplanation> = {
    revenue: {
      summary: `What you brought in from dress sales over ${span}, before any costs are taken off.`,
      caveat:
        "Added up from the revenue line of every style in your profit and loss sheet, one month at a time. The table below breaks it down month by month.",
    },
    units: {
      summary: `The number of dresses sold over ${span}.`,
      caveat: busiest
        ? `Counted from the units line of every style in your sheet. The busiest month was ${format(
            parseISO(busiest.month),
            "MMMM"
          )} with ${busiest.units.toLocaleString()}, which is why one bar in the chart stands so far above the rest.`
        : "Counted from the units line of every style in your sheet.",
    },
    costs: {
      summary: `Everything you paid out over ${span}, across the four cost groups in your sheet.`,
      rows: [
        { label: "Production", value: money(totals.costProduction) },
        { label: "Commercial", value: money(totals.costCommercial) },
        { label: "Marketing", value: money(totals.costMarketing) },
        { label: "Admin", value: money(totals.costAdmin) },
      ],
      formula: `Added together: ${money(totals.totalCosts)}`,
    },
    cashNet: {
      summary: "What is left once costs come off what you brought in.",
      formula: `${money(totals.revenue)} − ${money(totals.totalCosts)} = ${money(totals.cashNet)}`,
      caveat:
        "This is not profit. The costs are what you actually paid in each month, not the cost of the dresses you sold that month, so paying for a production run or an exhibition up front can push a month below zero even when the dresses sold well.",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{year} financials</CardTitle>
      </CardHeader>
      <p className="-mt-4 mb-5 text-xs text-ink/40">
        From the profit and loss spreadsheet, covering {describeSpan(totals)}. Separate from the sales and stock
        figures above, which are recorded piece by piece. Costs are what was paid in each month, not the cost of the
        pieces sold that month, so &ldquo;cash net&rdquo; swings with production runs and events.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Revenue"
          value={formatCurrency(totals.revenue, currency)}
          changePct={change(totals.revenue, "revenue")}
          comparisonLabel={comparisonLabel}
          explanation={explanations.revenue}
        />
        <MetricTile
          label="Units sold"
          value={totals.units.toLocaleString()}
          changePct={change(totals.units, "units")}
          comparisonLabel={comparisonLabel}
          explanation={explanations.units}
        />
        <MetricTile
          label="Costs"
          value={formatCurrency(totals.totalCosts, currency)}
          changePct={change(totals.totalCosts, "totalCosts")}
          comparisonLabel={comparisonLabel}
          explanation={explanations.costs}
        />
        <MetricTile
          label="Cash net"
          value={formatCurrency(totals.cashNet, currency)}
          changePct={change(totals.cashNet, "cashNet")}
          comparisonLabel={comparisonLabel}
          explanation={explanations.cashNet}
          tone="signed"
        />
      </div>

      {target && targetPct !== null && (
        <p className="mt-5 text-xs text-ink/50">
          Business plan target for {year} is {formatCurrency(target.revenue, currency)} of revenue.{" "}
          {describeSpan(totals)} is at {formatPercent(targetPct, 0)} of it.
        </p>
      )}

      <div className="mt-6">
        {rows.length > 0 ? (
          <FinancialsChart data={rows} />
        ) : (
          <p className="py-16 text-center text-sm text-ink/40">No months imported for {year} yet.</p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-ink/60">Month by month</p>
          <Table>
            <Thead>
              <tr>
                <Th>Month</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="text-right">Production</Th>
                <Th className="text-right">Commercial</Th>
                <Th className="text-right">Marketing</Th>
                <Th className="text-right">Admin</Th>
                <Th className="text-right">Costs</Th>
                <Th className="text-right">Cash net</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.month}>
                  <Td className="font-medium text-ink">{format(parseISO(r.month), "MMM yyyy")}</Td>
                  <Td className="text-right">{r.units.toLocaleString()}</Td>
                  <Td className="text-right">{formatCurrency(r.revenue, currency)}</Td>
                  <Td className="text-right">{formatCurrency(r.costProduction, currency)}</Td>
                  <Td className="text-right">{formatCurrency(r.costCommercial, currency)}</Td>
                  <Td className="text-right">{formatCurrency(r.costMarketing, currency)}</Td>
                  <Td className="text-right">{formatCurrency(r.costAdmin, currency)}</Td>
                  <Td className="text-right">{formatCurrency(r.totalCosts, currency)}</Td>
                  <Td
                    className={cn(
                      "text-right font-medium",
                      r.cashNet < 0 ? "text-red-600" : "text-emerald-700"
                    )}
                  >
                    {formatCurrency(r.cashNet, currency)}
                  </Td>
                </Tr>
              ))}
              <Tr className="bg-paper/60">
                <Td className="font-medium text-ink">Total</Td>
                <Td className="text-right font-medium text-ink">{totals.units.toLocaleString()}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.revenue, currency)}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.costProduction, currency)}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.costCommercial, currency)}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.costMarketing, currency)}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.costAdmin, currency)}</Td>
                <Td className="text-right font-medium text-ink">{formatCurrency(totals.totalCosts, currency)}</Td>
                <Td
                  className={cn(
                    "text-right font-medium",
                    totals.cashNet < 0 ? "text-red-600" : "text-emerald-700"
                  )}
                >
                  {formatCurrency(totals.cashNet, currency)}
                </Td>
              </Tr>
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
