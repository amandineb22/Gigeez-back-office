"use client";

import {
  Bar,
  CartesianGrid,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface TargetVsActualPoint {
  label: string;
  rangeLabel: string;
  actual: number;
  target: number | null;
}

const SERIES_LABELS: Record<string, string> = {
  actual: "Actual",
  target: "Business plan",
};

/** What was achieved against what was planned, one pair of bars per fiscal year. */
export function TargetVsActualChart({ data }: { data: TargetVsActualPoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
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
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(label: string, payload) =>
            payload?.[0]?.payload?.rangeLabel ? `${label} · ${payload[0].payload.rangeLabel}` : label
          }
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency),
            SERIES_LABELS[name] ?? name,
          ]}
        />
        <Legend
          formatter={(name: string) => SERIES_LABELS[name] ?? name}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar dataKey="actual" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="target" fill={CHART_COLORS.costs} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
