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
import type { InventoryValuePoint } from "@/lib/calculations";

export function InventoryValueChart({ data }: { data: InventoryValuePoint[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={260}>
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
        <Tooltip {...tooltipStyle} formatter={(value: number) => [formatCurrency(value, currency), "Inventory value"]} />
        <Line
          type="monotone"
          dataKey="inventoryValue"
          stroke={CHART_COLORS.categorical[6]}
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
