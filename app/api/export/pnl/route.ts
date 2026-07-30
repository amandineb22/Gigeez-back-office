import { NextRequest } from "next/server";
import { getSalesInRange } from "@/lib/data/sales";
import { getExpensesInRange } from "@/lib/data/expenses";
import { buildProfitAndLoss, type PnLGrouping, type PnLRow } from "@/lib/calculations";
import { parseDateRangeParams } from "@/lib/utils";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const range = parseDateRangeParams(Object.fromEntries(params));
  const grouping = (["month", "quarter", "year"].includes(params.get("grouping") ?? "")
    ? params.get("grouping")
    : "month") as PnLGrouping;

  const [sales, expenses] = await Promise.all([getSalesInRange(range), getExpensesInRange(range)]);
  const rows = buildProfitAndLoss(sales, expenses, grouping);

  const csv = toCsv<PnLRow>(rows, [
    { header: "Period", accessor: (r) => r.periodLabel },
    { header: "Revenue", accessor: (r) => r.revenue.toFixed(2) },
    { header: "COGS", accessor: (r) => r.cogs.toFixed(2) },
    { header: "Gross Profit", accessor: (r) => r.grossProfit.toFixed(2) },
    { header: "Gross Margin %", accessor: (r) => r.grossMarginPct.toFixed(1) },
    { header: "Operating Expenses", accessor: (r) => r.operatingExpenses.toFixed(2) },
    { header: "Net Profit", accessor: (r) => r.netProfit.toFixed(2) },
    { header: "Net Margin %", accessor: (r) => r.netMarginPct.toFixed(1) },
  ]);

  return csvResponse(csv, `pnl_${grouping}_${range.from}_to_${range.to}.csv`);
}
