import { getExpensesInRange } from "@/lib/data/expenses";
import { deleteExpense } from "@/lib/actions/expenses";
import { parseDateRangeParams } from "@/lib/utils";
import { parseCurrencyParam } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = parseDateRangeParams(params);
  const currency = parseCurrencyParam(params);
  const expenses = await getExpensesInRange(range);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Expenses</h1>
        <div className="flex gap-2">
          <LinkButton href={`/api/export/expenses?from=${range.from}&to=${range.to}`} variant="secondary" size="sm">
            Export CSV
          </LinkButton>
          <LinkButton href="/expenses/new" size="sm">
            Add expense
          </LinkButton>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title="No expenses in this range"
          description="Log an expense, or import the profit and loss sheet, to keep your P&L and cash flow accurate."
          actionLabel="Add expense"
          actionHref="/expenses/new"
        />
      ) : (
        <Card className="p-0">
          <ExpensesTable expenses={expenses} deleteExpense={deleteExpense} currency={currency} />
        </Card>
      )}
    </div>
  );
}
