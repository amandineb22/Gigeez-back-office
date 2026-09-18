import { getSalesInRange, getAllSales, countUndatedSales } from "@/lib/data/sales";
import { getExpensesInRange } from "@/lib/data/expenses";
import { getInventory } from "@/lib/data/inventory";
import { getReceivedPOsInRange } from "@/lib/data/purchaseOrders";
import { getAllGoals } from "@/lib/data/goals";
import { getFinancialMonths, getBpTargets, getHistoricYears } from "@/lib/data/financials";
import { parseCurrencyParam } from "@/lib/currency";
import {
  parseDateRangeParams,
  getPreviousPeriod,
  getYoYPeriod,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import {
  calculateKpiSummary,
  calculateSpreadsheetKpiSummary,
  financialMonthsInRange,
  shiftFinancialMonths,
  revenueByChannel,
  revenueByCategory,
  bestAndWorstProducts,
  returnRefundRate,
  calculateBreakEven,
  calculateInventoryValue,
  lowStockItems,
  buildProfitAndLoss,
  reconstructInventoryValueOverTime,
  pickChartGrouping,
  getGoalPeriodRange,
  calculateGoalProgress,
  sumRevenue,
  sumProfit,
  countOrders,
  averageOrderValue,
  totalFinancialYear,
  buildYearComparisons,
} from "@/lib/calculations";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProductPerformanceList } from "@/components/dashboard/ProductPerformanceList";
import { GoalProgressBar } from "@/components/dashboard/GoalProgressBar";
import { FinancialsSection } from "@/components/dashboard/FinancialsSection";
import { YearComparisonChart } from "@/components/charts/YearComparisonChart";
import { UndatedSalesNotice } from "@/components/dashboard/UndatedSalesNotice";
import { RevenueLineChart } from "@/components/charts/RevenueLineChart";
import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { InventoryValueChart } from "@/components/charts/InventoryValueChart";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { toTitleCase } from "@/lib/utils";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = parseDateRangeParams(params);
  const currency = parseCurrencyParam(params);
  const previousRange = getPreviousPeriod(range);
  const yoyRange = getYoYPeriod(range);
  const grouping = pickChartGrouping(range);

  const [
    salesCurrent,
    salesPrevious,
    salesYoy,
    expensesCurrent,
    inventory,
    receivedPOs,
    goals,
    allTimeSales,
    financialMonths,
    bpTargets,
    historicYears,
    undatedSalesCount,
  ] = await Promise.all([
    getSalesInRange(range),
    getSalesInRange(previousRange),
    getSalesInRange(yoyRange),
    getExpensesInRange(range),
    getInventory(),
    getReceivedPOsInRange(range),
    getAllGoals(),
    getAllSales(),
    getFinancialMonths(),
    getBpTargets(),
    getHistoricYears(),
    countUndatedSales(),
  ]);

  // The spreadsheet financials stand on their own, keyed to the most recent
  // year the sheet covers rather than to the date-range filter — the sheet is
  // a monthly record, so slicing it by arbitrary dates would misrepresent it.
  const financialYear = financialMonths.length
    ? Math.max(...financialMonths.map((m) => Number(m.month.slice(0, 4))))
    : null;
  const financialTotals = financialYear !== null ? totalFinancialYear(financialYear, financialMonths) : null;
  // Only offer a prior year to compare against when the sheet actually covers one.
  const previousFinancialYearTotals =
    financialYear !== null ? totalFinancialYear(financialYear - 1, financialMonths) : null;
  const previousFinancialTotals =
    previousFinancialYearTotals && previousFinancialYearTotals.monthsWithData > 0
      ? previousFinancialYearTotals
      : null;
  // Year on year across the whole history, on fiscal years — the basis the
  // business plan uses, and the only one the HIST tab's earlier years exist on.
  const yearComparisons = buildYearComparisons(financialMonths, historicYears, bpTargets);

  // Lifetime totals, independent of the date-range filter above — includes
  // historical sales with an unknown date (e.g. imported stock already
  // marked "sold") that period-based KPIs intentionally exclude, since they
  // can't be attributed to a specific period.
  const allTimeRevenue = sumRevenue(allTimeSales);
  const allTimeProfit = sumProfit(allTimeSales);
  const allTimeOrders = countOrders(allTimeSales);
  const allTimeAov = averageOrderValue(allTimeSales);

  // The headline cards and the two trend charts come from the spreadsheet for
  // any range it covers. `sales` holds only the pieces the stock sheet
  // captured, none of them dated, so on its own it leaves this page blank —
  // the sheet, by contrast, records every month in full.
  const fmCurrent = financialMonthsInRange(financialMonths, range);
  // Compared month for month rather than by date window, so a part-month range
  // still has something to compare against. See shiftFinancialMonths.
  const fmPrevious = shiftFinancialMonths(financialMonths, fmCurrent, fmCurrent.length);
  const fmYoy = shiftFinancialMonths(financialMonths, fmCurrent, 12);
  const kpisFromSheet = fmCurrent.length > 0;
  // A month can have sales recorded before its costs are. Profit then equals
  // revenue, which would read as a perfect margin if left unexplained.
  const sheetCostsMissing =
    kpisFromSheet &&
    fmCurrent.every(
      (m) => m.cost_production + m.cost_commercial + m.cost_marketing + m.cost_admin === 0
    );

  const kpis = kpisFromSheet
    ? calculateSpreadsheetKpiSummary(fmCurrent, fmPrevious.length ? fmPrevious : null, fmYoy.length ? fmYoy : null)
    : calculateKpiSummary(salesCurrent, salesPrevious, salesYoy);
  const channelData = revenueByChannel(salesCurrent);
  const categoryData = revenueByCategory(salesCurrent);
  const { best, worst } = bestAndWorstProducts(salesCurrent, 5);
  const refundRate = returnRefundRate(salesCurrent);
  const breakEven = calculateBreakEven(salesCurrent, expensesCurrent);
  const inventoryValue = calculateInventoryValue(inventory);
  const lowStock = lowStockItems(inventory);

  // The sheet is a monthly record, so charting it by day or week would invent
  // detail it does not have.
  const chartGrouping = kpisFromSheet ? "month" : grouping;
  const pnlRows = buildProfitAndLoss(salesCurrent, expensesCurrent, chartGrouping, fmCurrent);
  const revenueSeries = pnlRows.map((r) => ({ periodLabel: r.periodLabel, revenue: r.revenue, profit: r.grossProfit }));
  const profitSeries = pnlRows.map((r) => ({ periodLabel: r.periodLabel, netProfit: r.netProfit }));
  const inventorySeries = reconstructInventoryValueOverTime(inventoryValue, salesCurrent, receivedPOs, grouping);

  const expensePieFromRows = Array.from(
    expensesCurrent.reduce((map, e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
      return map;
    }, new Map<string, number>())
  ).map(([category, amount]) => ({ category, amount }));

  // The sheet splits costs into its own four bands rather than by category, so
  // fall back to those when the range holds no expense rows — a month the
  // sheet covers for revenue but whose individual cost lines aren't in yet.
  const expensePieFromSheet = [
    { category: "production", amount: fmCurrent.reduce((t, m) => t + m.cost_production, 0) },
    { category: "commercial", amount: fmCurrent.reduce((t, m) => t + m.cost_commercial, 0) },
    { category: "marketing", amount: fmCurrent.reduce((t, m) => t + m.cost_marketing, 0) },
    { category: "admin", amount: fmCurrent.reduce((t, m) => t + m.cost_admin, 0) },
  ].filter((slice) => slice.amount > 0);

  const expensePie = expensePieFromRows.length > 0 ? expensePieFromRows : expensePieFromSheet;
  const expensePieFromBands = expensePieFromRows.length === 0 && expensePieFromSheet.length > 0;

  // Channel, category, refund rate and break-even can only come from
  // individual sales, which the spreadsheet has no equivalent of. Say that,
  // rather than "no sales", on a page that is otherwise showing revenue.
  const noPieceDataMessage = kpisFromSheet
    ? "Needs individual sales, which your profit and loss sheet doesn't break down."
    : "No sales in this range yet.";

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeGoals = goals.filter((g) => {
    const r = getGoalPeriodRange(g);
    return r.from <= todayIso && todayIso <= r.to;
  });
  const goalProgresses = await Promise.all(
    activeGoals.map(async (goal) => {
      const goalRange = getGoalPeriodRange(goal);
      const goalSales = await getSalesInRange(goalRange);
      const actual =
        goal.metric_type === "revenue"
          ? sumRevenue(goalSales)
          : goal.metric_type === "profit"
            ? sumProfit(goalSales)
            : goal.metric_type === "orders"
              ? countOrders(goalSales)
              : averageOrderValue(goalSales);
      return { goal, progress: calculateGoalProgress(goal, actual) };
    })
  );

  if (
    salesCurrent.length === 0 &&
    expensesCurrent.length === 0 &&
    allTimeSales.length === 0 &&
    financialMonths.length === 0
  ) {
    return (
      <EmptyState
        title="No data in this range yet"
        description="Log your first sale or expense to start seeing revenue, profit, and inventory insights here."
        actionLabel="Add a sale"
        actionHref="/sales/new"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue" trend={kpis.revenue} currency={currency} />
          <KpiCard label="Profit" trend={kpis.profit} currency={currency} />
          <KpiCard
            label={kpisFromSheet ? "Dresses sold" : "Orders"}
            trend={kpis.orderCount}
            format="number"
          />
          <KpiCard
            label={kpisFromSheet ? "Avg. price per dress" : "Avg. order value"}
            trend={kpis.aov}
            currency={currency}
          />
        </div>
        {kpisFromSheet && (
          <p className="mt-2.5 text-xs text-ink/40">
            From your profit and loss sheet, which records every sale. Profit is revenue less all four cost bands —
            the same cash net shown below. Compared against the month before and the same month last year, wherever
            the sheet covers them.
          </p>
        )}
        {sheetCostsMissing && (
          <p className="mt-1.5 text-xs text-amber-700">
            Your sheet has no costs recorded for this period yet, so profit here is the same as revenue. Add them to
            the sheet and re-import, or widen the date range, to see a real margin.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All-time</CardTitle>
        </CardHeader>
        <p className="-mt-4 mb-2 text-xs text-ink/40">
          Every sale ever recorded, including historical pieces with an unknown sale date — unlike the cards above,
          this isn&rsquo;t affected by the date range at the top of the page.
        </p>
        {undatedSalesCount > 0 && (
          <p className="mb-4 text-xs text-amber-700">
            Read these as a rough guide, not as money earned. They come from the sales list, which recorded each
            dress at its tag price rather than what it actually sold for, so the amounts read high. The cards above
            use your profit and loss sheet instead.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Revenue</p>
            <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(allTimeRevenue, currency)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Profit</p>
            <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(allTimeProfit, currency)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Orders</p>
            <p className="mt-2 font-display text-2xl text-ink">{allTimeOrders.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Avg. order value</p>
            <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(allTimeAov, currency)}</p>
          </div>
        </div>
      </Card>

      {financialYear !== null && financialTotals && (
        <FinancialsSection
          year={financialYear}
          months={financialMonths.filter((m) => m.month.startsWith(`${financialYear}-`))}
          totals={financialTotals}
          previousTotals={previousFinancialTotals}
          currency={currency}
        />
      )}

      {yearComparisons.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Year by year</CardTitle>
          </CardHeader>
          <p className="-mt-4 mb-5 text-xs text-ink/40">
            Fiscal years ending 31 March. Revenue up to FY25 comes from the HIST tab of your spreadsheet, which
            recorded no unit counts, so the dress line starts at FY26 where the monthly sheet begins.
          </p>
          <YearComparisonChart
            data={yearComparisons.map((y) => ({
              label: y.label,
              rangeLabel: y.rangeLabel,
              revenue: y.revenue,
              units: y.units,
            }))}
          />
        </Card>
      )}

      <UndatedSalesNotice undatedSalesCount={undatedSalesCount} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Refund rate</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatPercent(refundRate)}</p>
          {kpisFromSheet && (
            <p className="mt-1 text-xs text-ink/40">From individual sales, which are still incomplete.</p>
          )}
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Break-even point</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {breakEven.breakEvenUnits ? `${Math.ceil(breakEven.breakEvenUnits)} units` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink/40">
            {breakEven.breakEvenRevenue
              ? formatCurrency(breakEven.breakEvenRevenue, currency)
              : kpisFromSheet
                ? "Needs a per-dress margin, which the sheet doesn't break down."
                : "Not reachable at current margins"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Inventory value</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatCurrency(inventoryValue, currency)}</p>
          <p className="mt-1 text-xs text-ink/40">
            {lowStock.length} SKU{lowStock.length === 1 ? "" : "s"} low on stock
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
          </CardHeader>
          {revenueSeries.length > 0 ? (
            <RevenueLineChart data={revenueSeries} />
          ) : (
            <p className="py-16 text-center text-sm text-ink/40">No sales in this range yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense breakdown</CardTitle>
          </CardHeader>
          {expensePieFromBands && (
            <p className="-mt-4 mb-4 text-xs text-ink/40">
              Your profit and loss sheet&rsquo;s four cost bands. The individual cost lines for this range
              aren&rsquo;t in the sheet yet.
            </p>
          )}
          {expensePie.length > 0 ? (
            <ExpensePieChart data={expensePie} />
          ) : (
            <p className="py-16 text-center text-sm text-ink/40">No expenses in this range yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profit trend</CardTitle>
          </CardHeader>
          {profitSeries.length > 0 ? (
            <ProfitTrendChart data={profitSeries} />
          ) : (
            <p className="py-16 text-center text-sm text-ink/40">Not enough data yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory value over time</CardTitle>
          </CardHeader>
          {inventorySeries.length > 0 ? (
            <InventoryValueChart data={inventorySeries} />
          ) : (
            <p className="py-16 text-center text-sm text-ink/40">Not enough data yet.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by channel</CardTitle>
          </CardHeader>
          {channelData.length > 0 ? (
            <ChannelBarChart data={channelData} />
          ) : (
            <p className="py-10 text-center text-sm text-ink/40">{noPieceDataMessage}</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
          </CardHeader>
          {categoryData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">{noPieceDataMessage}</p>
          ) : (
            <ul className="space-y-2.5">
              {categoryData.map((c) => (
                <li key={c.category} className="flex items-center justify-between text-sm">
                  <span className="text-ink/70">{toTitleCase(c.category)}</span>
                  <span className="font-medium text-ink">{formatCurrency(c.revenue, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-6">
          <ProductPerformanceList
            title="Best sellers"
            items={best}
            emptyLabel="No sales in this range yet."
            currency={currency}
          />
          <ProductPerformanceList
            title="Worst sellers"
            items={worst}
            emptyLabel="No sales in this range yet."
            currency={currency}
          />
        </Card>
      </div>

      {goalProgresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goals this period</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {goalProgresses.map(({ goal, progress }) => (
              <GoalProgressBar
                key={goal.id}
                title={`${toTitleCase(goal.metric_type)} · ${toTitleCase(goal.period_type)}`}
                progress={progress}
                currency={currency}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
