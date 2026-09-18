import { Card } from "@/components/ui/Card";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { KpiTrend } from "@/lib/calculations";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";

function TrendPill({ changePct, label }: { changePct: number | null; label: string }) {
  if (changePct === null) {
    return <span className="text-xs text-ink/30">{label}: n/a</span>;
  }
  const up = changePct > 0;
  const flat = Math.abs(changePct) < 0.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        flat ? "text-ink/40" : up ? "text-emerald-600" : "text-red-500"
      )}
    >
      {!flat && (up ? "▲" : "▼")}
      {formatPercent(Math.abs(changePct))} <span className="text-ink/35">{label}</span>
    </span>
  );
}

export function KpiCard({
  label,
  trend,
  format = "currency",
  currency = BASE_CURRENCY,
}: {
  label: string;
  trend: KpiTrend;
  format?: "currency" | "number";
  currency?: Currency;
}) {
  const displayValue =
    format === "currency" ? formatCurrency(trend.current, currency) : Math.round(trend.current).toLocaleString();

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{displayValue}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <TrendPill changePct={trend.previousPeriodChangePct} label="vs last period" />
        <TrendPill changePct={trend.yoyChangePct} label="YoY" />
      </div>
    </Card>
  );
}
