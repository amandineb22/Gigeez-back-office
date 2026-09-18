import { getSalesInRange, getAllSales } from "@/lib/data/sales";
import { getExpensesInRange } from "@/lib/data/expenses";
import { getInventory } from "@/lib/data/inventory";
import { getReceivedPOsInRange } from "@/lib/data/purchaseOrders";
import { getAllGoals } from "@/lib/data/goals";
import { getFinancialMonths, getBpTargets } from "@/lib/data/financials";
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
} from "@/lib/calculations";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ProductPerformanceList } from "@/components/dashboard/ProductPerformanceList";
import { GoalProgressBar } from "@/components/dashboard/GoalProgressBar";
import { FinancialsSection } from "@/components/dashboard/FinancialsSection";
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
  const financialTarget =
    financialYear !== null ? (bpTargets.find((t) => t.year === financialYear) ?? null) : null;

  // Lifetime totals, independent of the date-range filter above — includes
  // historical sales with an unknown date (e.g. imported stock already
  // marked "sold") that period-based KPIs intentionally exclude, since they
  // can't be attributed to a specific period.
  const allTimeRevenue = sumRevenue(allTimeSales);
  const allTimeProfit = sumProfit(allTimeSales);
  const allTimeOrders = countOrders(allTimeSales);
  const allTimeAov = averageOrderValue(allTimeSales);

  const kpis = calculateKpiSummary(salesCurrent, salesPrevious, salesYoy);
  const channelData = revenueByChannel(salesCurrent);
  const categoryData = revenueByCategory(salesCurrent);
  const { best, worst } = bestAndWorstProducts(salesCurrent, 5);
  const refundRate = returnRefundRate(salesCurrent);
  const breakEven = calculateBreakEven(salesCurrent, expensesCurrent);
  const inventoryValue = calculateInventoryValue(inventory);
  const lowStock = lowStockItems(inventory);

  const pnlRows = buildProfitAndLoss(salesCurrent, expensesCurrent, grouping);
  const revenueSeries = pnlRows.map((r) => ({ periodLabel: r.periodLabel, revenue: r.revenue, profit: r.grossProfit }));
  const profitSeries = pnlRows.map((r) => ({ periodLabel: r.periodLabel, netProfit: r.netProfit }));
  const inventorySeries = reconstructInventoryValueOverTime(inventoryValue, salesCurrent, receivedPOs, grouping);

  const expensePie = Array.from(
    expensesCurrent.reduce((map, e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
      return map;
    }, new Map<string, number>())
  ).map(([category, amount]) => ({ category, amount }));

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" trend={kpis.revenue} currency={currency} />
        <KpiCard label="Profit" trend={kpis.profit} currency={currency} />
        <KpiCard label="Orders" trend={kpis.orderCount} format="number" />
        <KpiCard label="Avg. order value" trend={kpis.aov} currency={currency} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All-time</CardTitle>
        </CardHeader>
        <p className="-mt-4 mb-4 text-xs text-ink/40">
          Every sale ever recorded, including historical pieces with an unknown sale date — unlike the cards above,
          this isn&rsquo;t affected by the date range at the top of the page.
        </p>
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
          target={financialTarget}
          currency={currency}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Refund rate</p>
          <p className="mt-2 font-display text-2xl text-ink">{formatPercent(refundRate)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Break-even point</p>
          <p className="mt-2 font-display text-2xl text-ink">
            {breakEven.breakEvenUnits ? `${Math.ceil(breakEven.breakEvenUnits)} units` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink/40">
            {breakEven.breakEvenRevenue
              ? formatCurrency(breakEven.breakEvenRevenue, currency)
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
            <p className="py-10 text-center text-sm text-ink/40">No sales in this range yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
          </CardHeader>
          {categoryData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">No sales in this range yet.</p>
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
