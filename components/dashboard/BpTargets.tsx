import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";
import { targetProgress, type FinancialYearTotals } from "@/lib/calculations";
import type { BpTarget } from "@/lib/types";

export interface BpTargetRow {
  target: BpTarget;
  /** Actuals for that year from the P&L sheet, when it covers the year at all. */
  actuals: FinancialYearTotals | null;
}

/**
 * Yearly business-plan targets, shown alongside the hand-set goals.
 *
 * These come from the BP (Target) sheet, which is stated in euros; they are
 * stored in QAR like everything else so the currency picker applies to them
 * too. Progress is only shown for years the P&L sheet actually covers.
 */
export function BpTargets({
  rows,
  currency = BASE_CURRENCY,
}: {
  rows: BpTargetRow[];
  currency?: Currency;
}) {
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business plan targets</CardTitle>
      </CardHeader>
      <p className="-mt-4 mb-5 text-xs text-ink/40">
        From the BP (Target) sheet. Progress compares each year against the revenue recorded in the profit and loss
        sheet, so it only appears for years that sheet covers.
      </p>
      <Table>
        <Thead>
          <tr>
            <Th>Year</Th>
            <Th className="text-right">Units</Th>
            <Th className="text-right">Revenue</Th>
            <Th className="text-right">Expenses</Th>
            <Th className="text-right">EBITDA</Th>
            <Th className="text-right">Actual revenue</Th>
            <Th className="text-right">Progress</Th>
          </tr>
        </Thead>
        <tbody>
          {rows.map(({ target, actuals }) => {
            const pct = actuals ? targetProgress(actuals.revenue, target.revenue) : null;
            return (
              <Tr key={target.year}>
                <Td className="font-medium text-ink">{target.year}</Td>
                <Td className="text-right">{target.units.toLocaleString()}</Td>
                <Td className="text-right">{formatCurrency(target.revenue, currency)}</Td>
                <Td className="text-right">{formatCurrency(target.expenses, currency)}</Td>
                <Td className="text-right">{formatCurrency(target.ebitda, currency)}</Td>
                <Td className="text-right">
                  {actuals ? formatCurrency(actuals.revenue, currency) : <span className="text-ink/30">—</span>}
                </Td>
                <Td
                  className={cn(
                    "text-right font-medium",
                    pct === null ? "text-ink/30" : pct >= 100 ? "text-emerald-700" : "text-ink/70"
                  )}
                >
                  {pct === null ? "—" : formatPercent(pct, 0)}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
