"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface ProfitTrendPoint {
  periodLabel: string;
  netProfit: number;
}

export function ProfitTrendChart({ data }: { data: ProfitTrendPoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.profit} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.profit} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <Tooltip {...tooltipStyle} formatter={(value: number) => [formatCurrency(value, currency), "Net profit"]} />
        <Area type="monotone" dataKey="netProfit" stroke={CHART_COLORS.profit} strokeWidth={2.5} fill="url(#profitFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
