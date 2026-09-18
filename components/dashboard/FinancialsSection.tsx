import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { FinancialsChart } from "@/components/charts/FinancialsChart";
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

function ComparisonPill({ changePct, label }: { changePct: number | null; label: string }) {
  if (changePct === null) {
    return <span className="text-xs text-ink/30">no {label} to compare</span>;
  }
  const up = changePct > 0;
  const flat = Math.abs(changePct) < 0.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        flat ? "text-ink/40" : up ? "text-emerald-600" : "text-red-500"
      )}
    >
      {!flat && (up ? "▲" : "▼")}
      {formatPercent(Math.abs(changePct))} <span className="text-ink/35">vs {label}</span>
    </span>
  );
}

function Tile({
  label,
  value,
  changePct,
  comparisonLabel,
  tone = "neutral",
}: {
  label: string;
  value: string;
  changePct: number | null;
  comparisonLabel: string;
  tone?: "neutral" | "signed";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl",
          tone === "signed" && value.trim().startsWith("-") ? "text-red-600" : "text-ink"
        )}
      >
        {value}
      </p>
      <div className="mt-2">
        <ComparisonPill changePct={changePct} label={comparisonLabel} />
      </div>
    </div>
  );
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
        <Tile
          label="Revenue"
          value={formatCurrency(totals.revenue, currency)}
          changePct={change(totals.revenue, "revenue")}
          comparisonLabel={comparisonLabel}
        />
        <Tile
          label="Units sold"
          value={totals.units.toLocaleString()}
          changePct={change(totals.units, "units")}
          comparisonLabel={comparisonLabel}
        />
        <Tile
          label="Costs"
          value={formatCurrency(totals.totalCosts, currency)}
          changePct={change(totals.totalCosts, "totalCosts")}
          comparisonLabel={comparisonLabel}
        />
        <Tile
          label="Cash net"
          value={formatCurrency(totals.cashNet, currency)}
          changePct={change(totals.cashNet, "cashNet")}
          comparisonLabel={comparisonLabel}
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
