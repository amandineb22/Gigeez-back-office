import { differenceInCalendarDays, parseISO } from "date-fns";
import { getSalesInRange } from "@/lib/data/sales";
import { getExpensesInRange } from "@/lib/data/expenses";
import {
  buildProfitAndLoss,
  buildCashFlow,
  calculateRunway,
  profitPerProduct,
  sumExpenses,
  type PnLGrouping,
} from "@/lib/calculations";
import { parseDateRangeParams, formatCurrency, formatPercent } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportControls } from "./ReportControls";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const currency = parseCurrencyParam(sp);
  const range = parseDateRangeParams(sp);
  const grouping = (["month", "quarter", "year"].includes(String(sp.grouping)) ? sp.grouping : "month") as PnLGrouping;
  const cashOnHand = Number(sp.cash ?? 0) || 0;

  const [sales, expenses] = await Promise.all([getSalesInRange(range), getExpensesInRange(range)]);

  const pnlRows = buildProfitAndLoss(sales, expenses, grouping);
  const cashFlowRows = buildCashFlow(sales, expenses, grouping, cashOnHand);
  const productProfit = profitPerProduct(sales);

  const monthsInRange = Math.max(differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) / 30.44, 1 / 30.44);
  const avgMonthlyExpenses = sumExpenses(expenses) / monthsInRange;
  const runway = calculateRunway(cashOnHand, avgMonthlyExpenses);

  const hasData = sales.length > 0 || expenses.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Reports</h1>
        <LinkButton
          href={`/api/export/pnl?from=${range.from}&to=${range.to}&grouping=${grouping}`}
          variant="secondary"
          size="sm"
        >
          Export P&amp;L CSV
        </LinkButton>
      </div>

      <Card>
        <ReportControls grouping={grouping} cashOnHand={cashOnHand} />
      </Card>

      {!hasData ? (
        <EmptyState
          title="No data in this range"
          description="Log sales and expenses to see a P&L, cash flow, and runway here."
        />
      ) : (
        <>
          <Card className="p-0">
            <div className="p-5 pb-0">
              <CardHeader>
                <CardTitle>Profit &amp; loss</CardTitle>
              </CardHeader>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Revenue</Th>
                  <Th>COGS</Th>
                  <Th>Gross profit</Th>
                  <Th>Gross margin</Th>
                  <Th>Op. expenses</Th>
                  <Th>Net profit</Th>
                  <Th>Net margin</Th>
                </tr>
              </Thead>
              <tbody>
                {pnlRows.map((row) => (
                  <Tr key={row.periodStart}>
                    <Td className="font-medium text-ink">{row.periodLabel}</Td>
                    <Td>{formatCurrency(row.revenue, currency)}</Td>
                    <Td>{formatCurrency(row.cogs, currency)}</Td>
                    <Td>{formatCurrency(row.grossProfit, currency)}</Td>
                    <Td>{formatPercent(row.grossMarginPct)}</Td>
                    <Td>{formatCurrency(row.operatingExpenses, currency)}</Td>
                    <Td className={row.netProfit < 0 ? "font-medium text-red-600" : "font-medium text-emerald-700"}>
                      {formatCurrency(row.netProfit, currency)}
                    </Td>
                    <Td>{formatPercent(row.netMarginPct)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="p-0 xl:col-span-2">
              <div className="p-5 pb-0">
                <CardHeader>
                  <CardTitle>Cash flow</CardTitle>
                </CardHeader>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>Period</Th>
                    <Th>Cash in</Th>
                    <Th>Cash out</Th>
                    <Th>Net</Th>
                    <Th>Running balance</Th>
                  </tr>
                </Thead>
                <tbody>
                  {cashFlowRows.map((row) => (
                    <Tr key={row.periodStart}>
                      <Td className="font-medium text-ink">{row.periodLabel}</Td>
                      <Td>{formatCurrency(row.cashIn, currency)}</Td>
                      <Td>{formatCurrency(row.cashOut, currency)}</Td>
                      <Td className={row.net < 0 ? "text-red-600" : "text-emerald-700"}>{formatCurrency(row.net, currency)}</Td>
                      <Td className="font-medium text-ink">{formatCurrency(row.runningBalance, currency)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Runway</p>
              <p className="mt-2 font-display text-2xl text-ink">
                {runway === null ? "∞" : `${runway.toFixed(1)} months`}
              </p>
              <p className="mt-1 text-xs text-ink/40">
                Based on {formatCurrency(cashOnHand, currency)} cash on hand ÷ {formatCurrency(avgMonthlyExpenses, currency)}/mo avg. expenses
              </p>
            </Card>
          </div>

          <Card className="p-0">
            <div className="p-5 pb-0">
              <CardHeader>
                <CardTitle>Profit per product</CardTitle>
              </CardHeader>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Units sold</Th>
                  <Th>Revenue</Th>
                  <Th>Profit</Th>
                  <Th>Margin</Th>
                </tr>
              </Thead>
              <tbody>
                {productProfit.map((p) => (
                  <Tr key={p.product_id}>
                    <Td className="font-medium text-ink">{p.product_name}</Td>
                    <Td>{p.unitsSold}</Td>
                    <Td>{formatCurrency(p.revenue, currency)}</Td>
                    <Td className={p.profit < 0 ? "text-red-600" : "text-emerald-700"}>{formatCurrency(p.profit, currency)}</Td>
                    <Td>{formatPercent(p.marginPct)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
