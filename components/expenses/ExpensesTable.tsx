"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate, toTitleCase } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Expense } from "@/lib/types";
import { EXPENSE_CATEGORY_BANDS } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export function ExpensesTable({
  expenses,
  deleteExpense,
  currency,
}: {
  expenses: Expense[];
  deleteExpense: (id: string) => Promise<void>;
  currency: Currency;
}) {
  const [category, setCategory] = useState("all");

  const categoriesByBand = useMemo(() => {
    const present = new Set(expenses.map((e) => e.category));
    return EXPENSE_CATEGORY_BANDS.map((band) => ({
      band,
      names: Array.from(present)
        .filter((name) => expenses.find((e) => e.category === name)?.cost_band === band)
        .sort(),
    })).filter((group) => group.names.length > 0);
  }, [expenses]);
  const uncategorizedCount = expenses.filter((e) => !e.cost_band).length;

  const filtered =
    category === "all"
      ? expenses
      : category === "__uncategorized__"
        ? expenses.filter((e) => !e.cost_band)
        : expenses.filter((e) => e.category === category);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
        <label className="text-sm text-ink/60" htmlFor="expense-category-filter">
          Category
        </label>
        <select
          id="expense-category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        >
          <option value="all">All categories</option>
          {categoriesByBand.map(({ band, names }) => (
            <optgroup key={band} label={toTitleCase(band)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
          {uncategorizedCount > 0 && <option value="__uncategorized__">Uncategorized (older rows)</option>}
        </select>
        <p className="ml-auto text-xs text-ink/40">
          {filtered.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="p-5 pt-0">
          <EmptyState title="No matching expenses" description="Try a different category." />
        </div>
      ) : (
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
            {filtered.map((e) => (
              <Tr key={e.id}>
                <Td className="whitespace-nowrap">{formatDate(e.expense_date)}</Td>
                <Td>
                  {e.category}
                  {e.cost_band && <div className="text-xs text-ink/40">{toTitleCase(e.cost_band)}</div>}
                </Td>
                <Td>
                  <Badge variant={e.cost_type === "fixed" ? "brand" : "neutral"}>{toTitleCase(e.cost_type)}</Badge>
                </Td>
                <Td>
                  {e.vendor ?? "—"}
                  {e.source_ref && (
                    <span className="ml-2 align-middle">
                      <Badge variant="neutral">From P&amp;L sheet</Badge>
                    </span>
                  )}
                </Td>
                <Td className="font-medium text-ink">{formatCurrency(e.amount, currency)}</Td>
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
      )}
    </div>
  );
}
