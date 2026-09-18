"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface FinancialsChartPoint {
  periodLabel: string;
  revenue: number;
  totalCosts: number;
  cashNet: number;
}

const SERIES_LABELS: Record<string, string> = {
  revenue: "Revenue",
  totalCosts: "Costs",
  cashNet: "Cash net",
};

/**
 * Monthly revenue and costs as bars, with cash net as a line across them.
 * The zero reference line matters here: months where a production run or an
 * exhibition was paid up front go properly negative.
 */
export function FinancialsChart({ data }: { data: FinancialsChartPoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          width={64}
        />
        <ReferenceLine y={0} stroke={CHART_COLORS.zero} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency),
            SERIES_LABELS[name] ?? name,
          ]}
        />
        <Legend
          formatter={(name: string) => SERIES_LABELS[name] ?? name}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="totalCosts" fill={CHART_COLORS.costs} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line
          type="monotone"
          dataKey="cashNet"
          stroke={CHART_COLORS.profit}
          strokeWidth={2.5}
          dot={{ r: 2.5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
