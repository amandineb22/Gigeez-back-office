import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { GoalStatusBadge } from "./GoalStatusBadge";
import type { GoalProgress } from "@/lib/calculations";
import { BASE_CURRENCY, type Currency } from "@/lib/currency";

const BAR_COLOR: Record<GoalProgress["status"], string> = {
  "on-track": "bg-emerald-500",
  "at-risk": "bg-amber-500",
  behind: "bg-red-500",
};

export function GoalProgressBar({
  title,
  progress,
  currency = BASE_CURRENCY,
}: {
  title: string;
  progress: GoalProgress;
  currency?: Currency;
}) {
  const pct = Math.min(Math.max(progress.percentOfTarget, 0), 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink/80">{title}</p>
        <GoalStatusBadge status={progress.status} />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={cn("h-full rounded-full transition-editorial", BAR_COLOR[progress.status])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink/50">
        {formatCurrency(progress.actual, currency)} of {formatCurrency(progress.target, currency)} ({formatPercent(progress.percentOfTarget, 0)})
      </p>
    </div>
  );
}
