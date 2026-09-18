import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TargetVsActualChart } from "@/components/charts/TargetVsActualChart";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";
import type { YearComparison } from "@/lib/calculations";

/**
 * Bar colour by how the year is going. Deliberately not a wall of red: the
 * percentage is stated plainly right beside it, so the colour only needs to
 * mark the genuinely good cases rather than scold every shortfall.
 */
function barTone(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 75) return "bg-amber-500";
  return "bg-brand-400";
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const width = Math.min(Math.max(pct, 0), 100);
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-ink/5", className)}>
      <div
        className={cn("h-full rounded-full transition-editorial", barTone(pct))}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/** The year still being lived: big numbers, a bar, and how much is left to go. */
function CurrentYearPanel({ year, currency }: { year: YearComparison; currency: Currency }) {
  const pct = year.percentOfTarget ?? 0;
  const remaining = (year.target ?? 0) - year.revenue;
  const monthsElapsed = year.monthsWithData;

  return (
    <div className="rounded-xl bg-paper px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-ink">
          {year.label} <span className="font-normal text-ink/40">· {year.rangeLabel}</span>
        </p>
        <p className="text-xs text-ink/40">
          {year.complete ? "Complete" : `In progress, ${monthsElapsed} of 12 months so far`}
        </p>
      </div>

      <p className="mt-3 font-display text-3xl text-ink">{formatPercent(pct, 0)}</p>
      <p className="mt-1 text-sm text-ink/60">
        {formatCurrency(year.revenue, currency)} of {formatCurrency(year.target ?? 0, currency)}
      </p>

      <ProgressBar pct={pct} className="mt-4 h-3" />

      {remaining > 0 && (
        <p className="mt-2.5 text-xs text-ink/50">
          {formatCurrency(remaining, currency)} still to go to reach the plan.
        </p>
      )}
    </div>
  );
}

/**
 * The business plan, made visual.
 *
 * Everything here is on fiscal years ending 31 March, the basis the plan is
 * built on, and every year is labelled with its actual months so the basis is
 * never left to be guessed at. The earliest years come from the HIST tab, the
 * later ones from the monthly P&L sheet.
 */
export function BpTargets({
  years,
  currentFiscalYear,
  currency = BASE_CURRENCY,
}: {
  years: YearComparison[];
  currentFiscalYear: number;
  currency?: Currency;
}) {
  if (years.length === 0) return null;

  const withTarget = years.filter((y) => y.target !== null);
  const current = withTarget.find((y) => y.fiscalYear === currentFiscalYear) ?? null;
  const past = withTarget.filter((y) => y.fiscalYear !== currentFiscalYear);

  const chartData = withTarget.map((y) => ({
    label: y.label,
    rangeLabel: y.rangeLabel,
    actual: y.revenue,
    target: y.target,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business plan</CardTitle>
      </CardHeader>
      <p className="-mt-4 mb-5 text-xs text-ink/40">
        Revenue against plan, on fiscal years ending 31 March. Figures up to FY25 come from the HIST tab of your
        spreadsheet, FY26 onwards from the monthly profit and loss sheet.
      </p>

      {current && (
        <div className="mb-6">
          <CurrentYearPanel year={current} currency={currency} />
        </div>
      )}

      {chartData.length > 0 && <TargetVsActualChart data={chartData} />}

      {past.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-ink/60">Year by year</p>
          {past.map((y) => (
            <div key={y.fiscalYear}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm text-ink/70">
                  {y.label} <span className="text-xs text-ink/35">· {y.rangeLabel}</span>
                  {!y.complete && <span className="ml-1.5 text-xs text-ink/35">· partial</span>}
                </p>
                <p className="text-sm">
                  <span className="font-medium text-ink">{formatCurrency(y.revenue, currency)}</span>
                  <span className="text-ink/35"> of {formatCurrency(y.target ?? 0, currency)}</span>
                  <span className="ml-2 font-medium text-ink/70">
                    {formatPercent(y.percentOfTarget ?? 0, 0)}
                  </span>
                </p>
              </div>
              <ProgressBar pct={y.percentOfTarget ?? 0} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
