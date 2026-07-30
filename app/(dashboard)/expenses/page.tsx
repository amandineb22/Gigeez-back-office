import { getExpensesInRange } from "@/lib/data/expenses";
import { deleteExpense } from "@/lib/actions/expenses";
import { parseDateRangeParams, formatCurrency, formatDate, toTitleCase } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const range = parseDateRangeParams(await searchParams);
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
          description="Log an expense to keep your P&L and cash flow accurate."
          actionLabel="Add expense"
          actionHref="/expenses/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Type</Th>
                <Th>Vendor</Th>
                <Th>Amount</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {expenses.map((e) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap">{formatDate(e.expense_date)}</Td>
                  <Td>{toTitleCase(e.category)}</Td>
                  <Td>
                    <Badge variant={e.cost_type === "fixed" ? "brand" : "neutral"}>{toTitleCase(e.cost_type)}</Badge>
                  </Td>
                  <Td>{e.vendor ?? "—"}</Td>
                  <Td className="font-medium text-ink">{formatCurrency(e.amount)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton href={`/expenses/${e.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deleteExpense.bind(null, e.id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this expense?">Delete</ConfirmSubmitButton>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
