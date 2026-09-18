"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface RevenueLineChartPoint {
  periodLabel: string;
  revenue: number;
  profit: number;
}

export function RevenueLineChart({ data }: { data: RevenueLineChartPoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="periodLabel"
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          tickFormatter={(v) => formatCurrencyCompact(v, currency)}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [formatCurrency(value, currency), name === "revenue" ? "Revenue" : "Profit"]}
        />
        <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="profit" stroke={CHART_COLORS.profit} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
