"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact, toTitleCase } from "@/lib/utils";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface ChannelBarDatum {
  channel: string;
  revenue: number;
}

export function ChannelBarChart({ data }: { data: ChannelBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="channel"
          tickFormatter={(v) => toTitleCase(v)}
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
          tickFormatter={(v) => formatCurrencyCompact(v)}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
          labelFormatter={(label: string) => toTitleCase(label)}
        />
        <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
