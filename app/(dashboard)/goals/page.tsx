import { getAllGoals } from "@/lib/data/goals";
import { getSalesInRange } from "@/lib/data/sales";
import { getBpTargets, getFinancialMonths } from "@/lib/data/financials";
import { deleteGoal } from "@/lib/actions/goals";
import {
  getGoalPeriodRange,
  calculateGoalProgress,
  sumRevenue,
  sumProfit,
  countOrders,
  averageOrderValue,
  totalFinancialYear,
} from "@/lib/calculations";
import { toTitleCase, formatDate } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { GoalProgressBar } from "@/components/dashboard/GoalProgressBar";
import { BpTargets, type BpTargetRow } from "@/components/dashboard/BpTargets";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currency = parseCurrencyParam(await searchParams);
  const [goals, bpTargets, financialMonths] = await Promise.all([
    getAllGoals(),
    getBpTargets(),
    getFinancialMonths(),
  ]);

  const financialYears = new Set(financialMonths.map((m) => Number(m.month.slice(0, 4))));
  const targetRows: BpTargetRow[] = bpTargets.map((target) => ({
    target,
    actuals: financialYears.has(target.year) ? totalFinancialYear(target.year, financialMonths) : null,
  }));

  const rows = await Promise.all(
    goals.map(async (goal) => {
      const range = getGoalPeriodRange(goal);
      const sales = await getSalesInRange(range);
      const actual =
        goal.metric_type === "revenue"
          ? sumRevenue(sales)
          : goal.metric_type === "profit"
            ? sumProfit(sales)
            : goal.metric_type === "orders"
              ? countOrders(sales)
              : averageOrderValue(sales);
      return { goal, range, progress: calculateGoalProgress(goal, actual) };
    })
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Goals</h1>
        <LinkButton href="/goals/new" size="sm">
          Add goal
        </LinkButton>
      </div>

      {rows.length === 0 && targetRows.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set a revenue, profit, orders, or AOV target to track progress here and on the dashboard."
          actionLabel="Add goal"
          actionHref="/goals/new"
        />
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/40">
          No goals set yet. The business plan targets below come from the spreadsheet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ goal, range, progress }) => (
            <Card key={goal.id}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-xs text-ink/40">
                  {formatDate(range.from)} – {formatDate(range.to)}
                </p>
                <div className="flex gap-1">
                  <LinkButton href={`/goals/${goal.id}/edit`} variant="ghost" size="sm">
                    Edit
                  </LinkButton>
                  <form action={deleteGoal.bind(null, goal.id)}>
                    <ConfirmSubmitButton confirmMessage="Delete this goal?">Delete</ConfirmSubmitButton>
                  </form>
                </div>
              </div>
              <GoalProgressBar
                title={`${toTitleCase(goal.metric_type)} · ${toTitleCase(goal.period_type)}`}
                progress={progress}
                currency={currency}
              />
              {goal.notes && <p className="mt-3 text-xs text-ink/50">{goal.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <BpTargets rows={targetRows} currency={currency} />
    </div>
  );
}
