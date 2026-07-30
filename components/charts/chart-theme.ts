import { theme } from "@/theme/config";

/** Shared color set for all Recharts components — keeps every chart visually consistent. */
export const CHART_COLORS = {
  revenue: theme.colors.brand[500],
  profit: theme.colors.accent[500],
  grid: "rgba(42, 36, 32, 0.08)",
  axis: "rgba(42, 36, 32, 0.4)",
  categorical: [
    theme.colors.brand[500],
    theme.colors.accent[500],
    theme.colors.brand[300],
    theme.colors.accent[300],
    theme.colors.brand[700],
    theme.colors.accent[700],
    "#C9A15A",
    "#7A8FA6",
  ],
};

export const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(42, 36, 32, 0.08)",
    boxShadow: "0 4px 16px rgba(42, 36, 32, 0.08)",
    fontSize: 13,
  },
};
