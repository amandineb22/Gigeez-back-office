import { NextRequest } from "next/server";
import { getExpensesInRange } from "@/lib/data/expenses";
import { parseDateRangeParams } from "@/lib/utils";
import { toCsv, csvResponse } from "@/lib/csv";
import type { Expense } from "@/lib/types";

export async function GET(request: NextRequest) {
  const range = parseDateRangeParams(Object.fromEntries(request.nextUrl.searchParams));
  const expenses = await getExpensesInRange(range);

  const csv = toCsv<Expense>(expenses, [
    { header: "Date", accessor: (e) => e.expense_date },
    { header: "Category", accessor: (e) => e.category },
    { header: "Type", accessor: (e) => e.cost_type },
    { header: "Vendor", accessor: (e) => e.vendor ?? "" },
    { header: "Amount", accessor: (e) => e.amount.toFixed(2) },
    { header: "Notes", accessor: (e) => e.notes ?? "" },
  ]);

  return csvResponse(csv, `expenses_${range.from}_to_${range.to}.csv`);
}
