import { NextRequest } from "next/server";
import { getSalesInRange } from "@/lib/data/sales";
import { parseDateRangeParams } from "@/lib/utils";
import { toCsv, csvResponse } from "@/lib/csv";
import type { SaleWithDetails } from "@/lib/types";

export async function GET(request: NextRequest) {
  const range = parseDateRangeParams(Object.fromEntries(request.nextUrl.searchParams));
  const sales = await getSalesInRange(range);

  const csv = toCsv<SaleWithDetails>(sales, [
    { header: "Date", accessor: (s) => s.sale_date },
    { header: "Product", accessor: (s) => s.product_name },
    { header: "SKU", accessor: (s) => s.sku },
    { header: "Size", accessor: (s) => s.size },
    { header: "Color", accessor: (s) => s.color },
    { header: "Quantity", accessor: (s) => s.quantity },
    { header: "Unit Price", accessor: (s) => s.unit_price.toFixed(2) },
    { header: "Channel", accessor: (s) => s.channel },
    { header: "Payment Method", accessor: (s) => s.payment_method },
    { header: "Discount", accessor: (s) => s.discount.toFixed(2) },
    { header: "Refund", accessor: (s) => (s.is_refund ? "Yes" : "No") },
    { header: "Revenue", accessor: (s) => s.revenue.toFixed(2) },
    { header: "COGS", accessor: (s) => s.cogs.toFixed(2) },
    { header: "Profit", accessor: (s) => s.profit.toFixed(2) },
    { header: "Notes", accessor: (s) => s.notes ?? "" },
  ]);

  return csvResponse(csv, `sales_${range.from}_to_${range.to}.csv`);
}
