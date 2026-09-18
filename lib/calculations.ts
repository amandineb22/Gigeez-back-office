/**
 * lib/calculations.ts
 * ============================================================================
 * Every derived number in the dashboard (margins, KPIs, break-even, runway,
 * sell-through, goal status...) is computed here and nowhere else. Pages and
 * components should only ever call these functions — never re-derive a
 * financial figure inline — so there is exactly one place to audit or adjust
 * the business logic.
 *
 * Inputs are plain arrays already fetched from Supabase (typically from the
 * `v_sales` / `v_inventory` views — see lib/types.ts), already filtered to
 * whatever date range the caller cares about. This file does no fetching.
 * ============================================================================
 */

import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type {
  Expense,
  FinancialMonth,
  Goal,
  InventoryRow,
  SaleWithDetails,
} from "./types";
import { type DateRange, percentChange } from "./utils";

// ============================================================================
// Section 1 — line-level revenue / profit (already computed by the v_sales
// view for stored rows; these helpers exist for computing a live preview in
// the sale entry form, before the row is saved).
// ============================================================================

export function calculateLineRevenue(params: {
  quantity: number;
  unitPrice: number;
  discount: number;
  isRefund: boolean;
}): number {
  const gross = params.quantity * params.unitPrice - params.discount;
  return params.isRefund ? -gross : gross;
}

export function calculateLineProfit(params: {
  quantity: number;
  unitPrice: number;
  discount: number;
  isRefund: boolean;
  baseCost: number;
}): number {
  const revenue = calculateLineRevenue(params);
  const cogs = params.quantity * params.baseCost;
  return params.isRefund ? revenue + cogs : revenue - cogs;
  // (when isRefund, revenue is already negative; refunding also returns the
  // COGS burden, so profit impact is revenue + cogs, i.e. less negative)
}

// ============================================================================
// Section 2 — period aggregates
// ============================================================================

export function sumRevenue(sales: SaleWithDetails[]): number {
  return sales.reduce((total, s) => total + s.revenue, 0);
}

export function sumProfit(sales: SaleWithDetails[]): number {
  return sales.reduce((total, s) => total + s.profit, 0);
}

export function sumCogs(sales: SaleWithDetails[]): number {
  return sales.reduce((total, s) => total + s.cogs, 0);
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + e.amount, 0);
}

/**
 * Order count: this dashboard stores one row per sale *line*, not a
 * multi-line order header, so we treat every non-refund line as one order.
 * Refund lines are excluded from the count but still net out of revenue.
 */
export function countOrders(sales: SaleWithDetails[]): number {
  return sales.filter((s) => !s.is_refund).length;
}

export function averageOrderValue(sales: SaleWithDetails[]): number {
  const orders = sales.filter((s) => !s.is_refund);
  if (orders.length === 0) return 0;
  const revenue = orders.reduce((total, s) => total + s.revenue, 0);
  return revenue / orders.length;
}

/** Refund rate = refunded lines / all lines, as a percent. */
export function returnRefundRate(sales: SaleWithDetails[]): number {
  if (sales.length === 0) return 0;
  const refunds = sales.filter((s) => s.is_refund).length;
  return (refunds / sales.length) * 100;
}

export function grossMarginPct(revenue: number, cogs: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cogs) / revenue) * 100;
}

export function netMarginPct(revenue: number, netProfit: number): number {
  if (revenue === 0) return 0;
  return (netProfit / revenue) * 100;
}

// ============================================================================
// Section 3 — headline KPI cards with period-over-period + YoY comparison
// ============================================================================

export interface KpiTrend {
  current: number;
  previousPeriod: number | null;
  previousPeriodChangePct: number | null;
  yoy: number | null;
  yoyChangePct: number | null;
  direction: "up" | "down" | "flat";
}

export function buildKpiTrend(
  current: number,
  previousPeriod: number | null,
  yoy: number | null
): KpiTrend {
  const previousPeriodChangePct =
    previousPeriod === null ? null : percentChange(current, previousPeriod);
  const yoyChangePct = yoy === null ? null : percentChange(current, yoy);
  const direction: KpiTrend["direction"] =
    previousPeriodChangePct === null || Math.abs(previousPeriodChangePct) < 0.5
      ? "flat"
      : previousPeriodChangePct > 0
        ? "up"
        : "down";

  return { current, previousPeriod, previousPeriodChangePct, yoy, yoyChangePct, direction };
}

export interface KpiSummary {
  revenue: KpiTrend;
  profit: KpiTrend;
  orderCount: KpiTrend;
  aov: KpiTrend;
}

/** The four headline dashboard cards, each with previous-period and YoY comparisons. */
export function calculateKpiSummary(
  current: SaleWithDetails[],
  previousPeriod: SaleWithDetails[] | null,
  yoy: SaleWithDetails[] | null
): KpiSummary {
  const revenue = sumRevenue(current);
  const profit = sumProfit(current);
  const orderCount = countOrders(current);
  const aov = averageOrderValue(current);

  const prevRevenue = previousPeriod ? sumRevenue(previousPeriod) : null;
  const prevProfit = previousPeriod ? sumProfit(previousPeriod) : null;
  const prevOrders = previousPeriod ? countOrders(previousPeriod) : null;
  const prevAov = previousPeriod ? averageOrderValue(previousPeriod) : null;

  const yoyRevenue = yoy ? sumRevenue(yoy) : null;
  const yoyProfit = yoy ? sumProfit(yoy) : null;
  const yoyOrders = yoy ? countOrders(yoy) : null;
  const yoyAov = yoy ? averageOrderValue(yoy) : null;

  return {
    revenue: buildKpiTrend(revenue, prevRevenue, yoyRevenue),
    profit: buildKpiTrend(profit, prevProfit, yoyProfit),
    orderCount: buildKpiTrend(orderCount, prevOrders, yoyOrders),
    aov: buildKpiTrend(aov, prevAov, yoyAov),
  };
}

// ============================================================================
// Section 4 — breakdowns (by channel, by category, best/worst products)
// ============================================================================

export interface ChannelBreakdown {
  channel: string;
  revenue: number;
  profit: number;
}

export function revenueByChannel(sales: SaleWithDetails[]): ChannelBreakdown[] {
  const map = new Map<string, ChannelBreakdown>();
  for (const s of sales) {
    const row = map.get(s.channel) ?? { channel: s.channel, revenue: 0, profit: 0 };
    row.revenue += s.revenue;
    row.profit += s.profit;
    map.set(s.channel, row);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  profit: number;
}

export function revenueByCategory(sales: SaleWithDetails[]): CategoryBreakdown[] {
  const map = new Map<string, CategoryBreakdown>();
  for (const s of sales) {
    const row = map.get(s.category) ?? { category: s.category, revenue: 0, profit: 0 };
    row.revenue += s.revenue;
    row.profit += s.profit;
    map.set(s.category, row);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export function productPerformance(sales: SaleWithDetails[]): ProductPerformance[] {
  const map = new Map<string, ProductPerformance>();
  for (const s of sales) {
    const row =
      map.get(s.product_id) ??
      ({ product_id: s.product_id, product_name: s.product_name, unitsSold: 0, revenue: 0, profit: 0 } as ProductPerformance);
    row.unitsSold += s.is_refund ? -s.quantity : s.quantity;
    row.revenue += s.revenue;
    row.profit += s.profit;
    map.set(s.product_id, row);
  }
  return Array.from(map.values());
}

export function bestAndWorstProducts(
  sales: SaleWithDetails[],
  limit = 5
): { best: ProductPerformance[]; worst: ProductPerformance[] } {
  const perf = productPerformance(sales).sort((a, b) => b.revenue - a.revenue);
  return {
    best: perf.slice(0, limit),
    worst: perf.slice(-limit).reverse(),
  };
}

// ============================================================================
// Section 5 — P&L statement (monthly / quarterly / yearly)
// ============================================================================

export type PnLGrouping = "day" | "week" | "month" | "quarter" | "year";

/**
 * Picks a sensible chart bucket size for a given date range so "revenue over
 * time" style charts don't collapse a one-month filter into a single point,
 * nor render 400 daily bars for a multi-year filter. Used by the dashboard
 * home page; the Reports page instead lets the user pick month/quarter/year
 * explicitly for the formal P&L.
 */
export function pickChartGrouping(range: DateRange): PnLGrouping {
  const days = differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  if (days <= 900) return "month";
  return "quarter";
}

export interface PnLRow {
  periodLabel: string;
  periodStart: string; // ISO date, used for stable sorting
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
}

function periodKey(dateStr: string, grouping: PnLGrouping): { key: string; label: string; start: string } {
  const d = parseISO(dateStr);
  if (grouping === "year") {
    const year = d.getFullYear();
    return { key: `${year}`, label: `${year}`, start: `${year}-01-01` };
  }
  if (grouping === "quarter") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    const year = d.getFullYear();
    const startMonth = (q - 1) * 3;
    return {
      key: `${year}-Q${q}`,
      label: `Q${q} ${year}`,
      start: format(new Date(year, startMonth, 1), "yyyy-MM-dd"),
    };
  }
  if (grouping === "week") {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return {
      key: format(start, "yyyy-MM-dd"),
      label: format(start, "MMM d"),
      start: format(start, "yyyy-MM-dd"),
    };
  }
  if (grouping === "day") {
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "MMM d"), start: format(d, "yyyy-MM-dd") };
  }
  return {
    key: format(d, "yyyy-MM"),
    label: format(d, "MMM yyyy"),
    start: format(startOfMonth(d), "yyyy-MM-dd"),
  };
}

/** Builds one P&L row per period covering both sales and expenses in range. */
export function buildProfitAndLoss(
  sales: SaleWithDetails[],
  expenses: Expense[],
  grouping: PnLGrouping
): PnLRow[] {
  interface Acc {
    label: string;
    start: string;
    revenue: number;
    cogs: number;
    operatingExpenses: number;
  }
  const map = new Map<string, Acc>();

  for (const s of sales) {
    if (!s.sale_date) continue; // unknown-date historical sales aren't attributable to a period
    const { key, label, start } = periodKey(s.sale_date, grouping);
    const row = map.get(key) ?? { label, start, revenue: 0, cogs: 0, operatingExpenses: 0 };
    row.revenue += s.revenue;
    row.cogs += s.cogs;
    map.set(key, row);
  }

  for (const e of expenses) {
    const { key, label, start } = periodKey(e.expense_date, grouping);
    const row = map.get(key) ?? { label, start, revenue: 0, cogs: 0, operatingExpenses: 0 };
    row.operatingExpenses += e.amount;
    map.set(key, row);
  }

  return Array.from(map.values())
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((row) => {
      const grossProfit = row.revenue - row.cogs;
      const netProfit = grossProfit - row.operatingExpenses;
      return {
        periodLabel: row.label,
        periodStart: row.start,
        revenue: row.revenue,
        cogs: row.cogs,
        grossProfit,
        grossMarginPct: grossMarginPct(row.revenue, row.cogs),
        operatingExpenses: row.operatingExpenses,
        netProfit,
        netMarginPct: netMarginPct(row.revenue, netProfit),
      };
    });
}

export interface ProductProfitRow extends ProductPerformance {
  marginPct: number;
}

/** Net profit per product is revenue minus COGS only — operating expenses aren't attributable per-SKU. */
export function profitPerProduct(sales: SaleWithDetails[]): ProductProfitRow[] {
  return productPerformance(sales)
    .map((p) => ({ ...p, marginPct: grossMarginPct(p.revenue, p.revenue - p.profit) }))
    .sort((a, b) => b.profit - a.profit);
}

// ============================================================================
// Section 6 — cash flow + runway
// ============================================================================

export interface CashFlowRow {
  periodLabel: string;
  periodStart: string;
  cashIn: number;
  cashOut: number;
  net: number;
  runningBalance: number;
}

/**
 * Cash in = collected sale revenue (refunds subtract naturally, since their
 * revenue is already negative). Cash out = expenses. This is a simple cash
 * model (no accrual/AR timing) appropriate for a small manually-entered book.
 */
export function buildCashFlow(
  sales: SaleWithDetails[],
  expenses: Expense[],
  grouping: PnLGrouping,
  startingBalance = 0
): CashFlowRow[] {
  interface Acc {
    label: string;
    start: string;
    cashIn: number;
    cashOut: number;
  }
  const map = new Map<string, Acc>();

  for (const s of sales) {
    if (!s.sale_date) continue; // unknown-date historical sales aren't attributable to a period
    const { key, label, start } = periodKey(s.sale_date, grouping);
    const row = map.get(key) ?? { label, start, cashIn: 0, cashOut: 0 };
    row.cashIn += s.revenue;
    map.set(key, row);
  }
  for (const e of expenses) {
    const { key, label, start } = periodKey(e.expense_date, grouping);
    const row = map.get(key) ?? { label, start, cashIn: 0, cashOut: 0 };
    row.cashOut += e.amount;
    map.set(key, row);
  }

  let running = startingBalance;
  return Array.from(map.values())
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((row) => {
      const net = row.cashIn - row.cashOut;
      running += net;
      return {
        periodLabel: row.label,
        periodStart: row.start,
        cashIn: row.cashIn,
        cashOut: row.cashOut,
        net,
        runningBalance: running,
      };
    });
}

/**
 * Runway = months of operating expenses the current cash balance covers.
 * Returns null when there's no meaningful average expense to divide by
 * (treat as "infinite runway" in the UI).
 */
export function calculateRunway(currentCash: number, avgMonthlyExpenses: number): number | null {
  if (avgMonthlyExpenses <= 0) return null;
  return currentCash / avgMonthlyExpenses;
}

// ============================================================================
// Section 7 — break-even point
// ============================================================================

export interface BreakEvenResult {
  contributionMarginPerUnit: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
}

/**
 * Classic break-even: fixedCosts / (avgSellingPrice - avgVariableCostPerUnit).
 * avgVariableCostPerUnit = COGS/unit + variable expenses spread per unit sold
 * over the same period, so marketing/shipping variable spend is captured too.
 */
export function calculateBreakEven(
  sales: SaleWithDetails[],
  expenses: Expense[]
): BreakEvenResult {
  const unitsSold = sales.reduce((total, s) => total + (s.is_refund ? 0 : s.quantity), 0);
  const grossSales = sales.filter((s) => !s.is_refund);
  const totalRevenue = grossSales.reduce((total, s) => total + s.revenue, 0);
  const totalCogs = grossSales.reduce((total, s) => total + s.cogs, 0);

  const fixedCosts = expenses.filter((e) => e.cost_type === "fixed").reduce((t, e) => t + e.amount, 0);
  const variableCosts = expenses.filter((e) => e.cost_type === "variable").reduce((t, e) => t + e.amount, 0);

  if (unitsSold === 0) {
    return { contributionMarginPerUnit: 0, breakEvenUnits: null, breakEvenRevenue: null };
  }

  const avgSellingPrice = totalRevenue / unitsSold;
  const avgVariableCostPerUnit = totalCogs / unitsSold + variableCosts / unitsSold;
  const contributionMarginPerUnit = avgSellingPrice - avgVariableCostPerUnit;

  if (contributionMarginPerUnit <= 0) {
    return { contributionMarginPerUnit, breakEvenUnits: null, breakEvenRevenue: null };
  }

  const breakEvenUnits = fixedCosts / contributionMarginPerUnit;
  return {
    contributionMarginPerUnit,
    breakEvenUnits,
    breakEvenRevenue: breakEvenUnits * avgSellingPrice,
  };
}

// ============================================================================
// Section 8 — inventory
// ============================================================================

export function calculateInventoryValue(inventory: InventoryRow[]): number {
  return inventory.reduce((total, row) => total + row.inventory_value, 0);
}

export function lowStockItems(inventory: InventoryRow[]): InventoryRow[] {
  return inventory.filter((row) => row.low_stock);
}

/**
 * Sell-through rate for a single variant over a period: units sold / (units
 * sold + units still in stock). We don't retain a historical "beginning
 * inventory" snapshot, so current stock is used as the denominator's stock
 * term — this approximates sell-through for the trailing period queried.
 */
export function sellThroughRate(unitsSoldInPeriod: number, currentStock: number): number {
  const denominator = unitsSoldInPeriod + currentStock;
  if (denominator === 0) return 0;
  return (unitsSoldInPeriod / denominator) * 100;
}

export interface DeadStockRow extends InventoryRow {
  daysSinceLastSale: number | null;
}

/**
 * Flags variants with stock on hand that haven't sold in `thresholdDays`.
 * `lastSaleDateByVariant` should map variant_id -> most recent sale_date
 * (ISO), computed by the caller from the full, unfiltered sales history.
 */
export function findDeadStock(
  inventory: InventoryRow[],
  lastSaleDateByVariant: Map<string, string>,
  thresholdDays: number,
  asOf: Date = new Date()
): DeadStockRow[] {
  return inventory
    .filter((row) => row.stock_quantity > 0)
    .map((row) => {
      const lastSale = lastSaleDateByVariant.get(row.variant_id);
      const daysSinceLastSale = lastSale
        ? differenceInCalendarDays(asOf, parseISO(lastSale))
        : null;
      return { ...row, daysSinceLastSale };
    })
    .filter((row) => row.daysSinceLastSale === null || row.daysSinceLastSale >= thresholdDays);
}

export interface InventoryValuePoint {
  periodLabel: string;
  periodStart: string;
  inventoryValue: number;
}

/**
 * We don't store daily inventory snapshots, so "inventory value over time"
 * is reconstructed rather than read directly: starting from the current
 * total inventory value, we walk the range's stock-changing events (sales
 * consume value, received purchase orders add value) to back into what the
 * value must have been at the start of the range, then replay forward.
 * `receivedPOs` should already be filtered to `received = true` within range.
 */
export function reconstructInventoryValueOverTime(
  currentInventoryValue: number,
  salesInRange: SaleWithDetails[],
  receivedPOsInRange: { variant_id: string; quantity_ordered: number; unit_cost: number; received_at: string }[],
  grouping: PnLGrouping
): InventoryValuePoint[] {
  interface Acc {
    label: string;
    start: string;
    costIn: number;
    costOut: number;
  }
  const map = new Map<string, Acc>();

  for (const s of salesInRange) {
    if (!s.sale_date) continue; // unknown-date historical sales aren't attributable to a period
    const { key, label, start } = periodKey(s.sale_date, grouping);
    const row = map.get(key) ?? { label, start, costIn: 0, costOut: 0 };
    row.costOut += s.cogs; // view already flips sign for refunds, so this nets out correctly
    map.set(key, row);
  }
  for (const po of receivedPOsInRange) {
    const { key, label, start } = periodKey(po.received_at, grouping);
    const row = map.get(key) ?? { label, start, costIn: 0, costOut: 0 };
    row.costIn += po.quantity_ordered * po.unit_cost;
    map.set(key, row);
  }

  const sorted = Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start));
  const totalNetChange = sorted.reduce((total, row) => total + row.costIn - row.costOut, 0);

  let running = currentInventoryValue - totalNetChange;
  return sorted.map((row) => {
    running += row.costIn - row.costOut;
    return { periodLabel: row.label, periodStart: row.start, inventoryValue: Math.max(running, 0) };
  });
}

// ============================================================================
// Section 9 — goals & progress
// ============================================================================

export type GoalStatus = "on-track" | "at-risk" | "behind";

export interface GoalProgress {
  actual: number;
  target: number;
  percentOfTarget: number;
  percentOfPeriodElapsed: number;
  status: GoalStatus;
  periodEnd: string;
}

/** The [start, end) date range a goal's period covers, derived from period_type. */
export function getGoalPeriodRange(goal: Pick<Goal, "period_type" | "period_start">): DateRange {
  const start = parseISO(goal.period_start);
  let end: Date;
  if (goal.period_type === "yearly") {
    end = addYears(start, 1);
  } else if (goal.period_type === "quarterly") {
    end = addMonths(start, 3);
  } else {
    end = endOfMonth(start);
  }
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
}

/**
 * Status thresholds: on-track if progress is keeping pace with (or ahead of)
 * time elapsed in the period; at-risk if within 25 points behind pace;
 * otherwise behind. `asOf` defaults to now so this stays correct at any call site.
 */
export function calculateGoalProgress(
  goal: Pick<Goal, "period_type" | "period_start" | "target_amount">,
  actual: number,
  asOf: Date = new Date()
): GoalProgress {
  const range = getGoalPeriodRange(goal);
  const start = parseISO(range.from);
  const end = parseISO(range.to);
  const totalDays = Math.max(differenceInCalendarDays(end, start), 1);
  const elapsedDays = Math.min(Math.max(differenceInCalendarDays(asOf, start), 0), totalDays);

  const percentOfPeriodElapsed = (elapsedDays / totalDays) * 100;
  const percentOfTarget = goal.target_amount === 0 ? 0 : (actual / goal.target_amount) * 100;

  const pacePercent = Math.max(percentOfPeriodElapsed, 1);
  const paceRatio = percentOfTarget / pacePercent;

  let status: GoalStatus = "behind";
  if (paceRatio >= 0.95) status = "on-track";
  else if (paceRatio >= 0.7) status = "at-risk";

  return { actual, target: goal.target_amount, percentOfTarget, percentOfPeriodElapsed, status, periodEnd: range.to };
}

// ============================================================================
// Spreadsheet financials
//
// These work on the monthly rows imported from the Gigeez P&L sheet, not on
// the `sales` / `expenses` tables. The two record the same business in
// different ways, so figures from one are never mixed into the other.
// ============================================================================

export interface FinancialMonthSummary {
  month: string;
  /** Short label for charts, e.g. "Jan". */
  periodLabel: string;
  units: number;
  revenue: number;
  costProduction: number;
  costCommercial: number;
  costMarketing: number;
  costAdmin: number;
  totalCosts: number;
  /**
   * Revenue less the cash paid out that month. This is not accounting profit:
   * the spreadsheet's costs are what was spent in the month, not the cost of
   * the pieces sold in it, so a month can look deeply negative simply because
   * a production run or an exhibition was paid for up front.
   */
  cashNet: number;
}

export interface FinancialYearTotals {
  year: number;
  units: number;
  revenue: number;
  costProduction: number;
  costCommercial: number;
  costMarketing: number;
  costAdmin: number;
  totalCosts: number;
  cashNet: number;
  /** Months that actually carry data, used to label partial years honestly. */
  monthsWithData: number;
  firstMonth: string | null;
  lastMonth: string | null;
}

export function summarizeFinancialMonth(row: FinancialMonth): FinancialMonthSummary {
  const totalCosts =
    row.cost_production + row.cost_commercial + row.cost_marketing + row.cost_admin;
  return {
    month: row.month,
    periodLabel: format(parseISO(row.month), "MMM"),
    units: row.units,
    revenue: row.revenue,
    costProduction: row.cost_production,
    costCommercial: row.cost_commercial,
    costMarketing: row.cost_marketing,
    costAdmin: row.cost_admin,
    totalCosts,
    cashNet: row.revenue - totalCosts,
  };
}

export function summarizeFinancialMonths(rows: FinancialMonth[]): FinancialMonthSummary[] {
  return rows.map(summarizeFinancialMonth);
}

export function totalFinancialYear(year: number, rows: FinancialMonth[]): FinancialYearTotals {
  const months = rows.filter((r) => r.month.startsWith(`${year}-`));
  const totals = months.reduce(
    (acc, r) => {
      acc.units += r.units;
      acc.revenue += r.revenue;
      acc.costProduction += r.cost_production;
      acc.costCommercial += r.cost_commercial;
      acc.costMarketing += r.cost_marketing;
      acc.costAdmin += r.cost_admin;
      return acc;
    },
    {
      units: 0,
      revenue: 0,
      costProduction: 0,
      costCommercial: 0,
      costMarketing: 0,
      costAdmin: 0,
    }
  );

  const totalCosts =
    totals.costProduction + totals.costCommercial + totals.costMarketing + totals.costAdmin;

  return {
    year,
    ...totals,
    totalCosts,
    cashNet: totals.revenue - totalCosts,
    monthsWithData: months.length,
    firstMonth: months[0]?.month ?? null,
    lastMonth: months[months.length - 1]?.month ?? null,
  };
}

/** Percentage change between two years' figures, or null when there's no base to compare against. */
export function yearOverYearChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Progress of a year's actual revenue against its business-plan target. */
export function targetProgress(actual: number, target: number): number {
  if (target === 0) return 0;
  return (actual / target) * 100;
}
