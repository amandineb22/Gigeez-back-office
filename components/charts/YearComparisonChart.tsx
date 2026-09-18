"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface YearComparisonPoint {
  label: string;
  rangeLabel: string;
  revenue: number;
  /** Null for the years that come from the HIST tab, which recorded no units. */
  units: number | null;
}

/**
 * Revenue and units side by side across the fiscal years.
 *
 * Units sit on their own right-hand axis because a dress count and a riyal
 * figure share no scale. The earliest years have no unit count at all — the
 * HIST tab never recorded one — so the line simply starts where the data does
 * rather than pretending those years were zero.
 */
export function YearComparisonChart({ data }: { data: YearComparisonPoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          yAxisId="money"
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          tickFormatter={(v) => formatCurrencyCompact(v, currency)}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <YAxis
          yAxisId="units"
          orientation="right"
          tick={{ fontSize: 12, fill: CHART_COLORS.units }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(label: string, payload) =>
            payload?.[0]?.payload?.rangeLabel ? `${label} · ${payload[0].payload.rangeLabel}` : label
          }
          formatter={(value: number, name: string) =>
            name === "units"
              ? [value.toLocaleString(), "Dresses sold"]
              : [formatCurrency(value, currency), "Revenue"]
          }
        />
        <Legend
          formatter={(name: string) => (name === "units" ? "Dresses sold" : "Revenue")}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          yAxisId="money"
          dataKey="revenue"
          fill={CHART_COLORS.revenue}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
        <Line
          yAxisId="units"
          type="monotone"
          dataKey="units"
          stroke={CHART_COLORS.units}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
