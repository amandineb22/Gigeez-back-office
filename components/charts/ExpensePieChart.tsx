"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, toTitleCase } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { CHART_COLORS, tooltipStyle } from "./chart-theme";

export interface ExpensePieSlice {
  category: string;
  amount: number;
}

export function ExpensePieChart({ data }: { data: ExpensePieSlice[] }) {
  const currency = useCurrency();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={CHART_COLORS.categorical[i % CHART_COLORS.categorical.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [formatCurrency(value, currency), toTitleCase(name)]} />
        <Legend
          formatter={(value: string) => toTitleCase(value)}
          wrapperStyle={{ fontSize: 12, color: CHART_COLORS.axis }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
