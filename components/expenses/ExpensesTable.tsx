"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDate, toTitleCase } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import type { Expense, ExpenseCategoryBand } from "@/lib/types";
import { EXPENSE_CATEGORY_BANDS } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

const BAND_PREFIX = "band:";
const UNCATEGORIZED = "__uncategorized__";

function bandValue(band: ExpenseCategoryBand) {
  return `${BAND_PREFIX}${band}`;
}

export function ExpensesTable({
  expenses,
  deleteExpense,
  currency,
}: {
  expenses: Expense[];
  deleteExpense: (id: string) => Promise<void>;
  currency: Currency;
}) {
  const [filter, setFilter] = useState("all");

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

  const filtered = useMemo(() => {
    if (filter === "all") return expenses;
    if (filter === UNCATEGORIZED) return expenses.filter((e) => !e.cost_band);
    if (filter.startsWith(BAND_PREFIX)) {
      const band = filter.slice(BAND_PREFIX.length);
      return expenses.filter((e) => e.cost_band === band);
    }
    return expenses.filter((e) => e.category === filter);
  }, [expenses, filter]);

  const filterLabel =
    filter === "all"
      ? "All categories"
      : filter === UNCATEGORIZED
        ? "Uncategorized"
        : filter.startsWith(BAND_PREFIX)
          ? `All ${toTitleCase(filter.slice(BAND_PREFIX.length))}`
          : filter;
  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-ink/5 bg-paper/60 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Total — {filterLabel}</p>
          <p className="mt-1 font-display text-2xl text-ink">{formatCurrency(total, currency)}</p>
        </div>
        <p className="text-xs text-ink/40">
          {filtered.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-5">
        <label className="text-sm text-ink/60" htmlFor="expense-category-filter">
          Category
        </label>
        <select
          id="expense-category-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        >
          <option value="all">All categories</option>
          <optgroup label="Whole band">
            {EXPENSE_CATEGORY_BANDS.map((band) => (
              <option key={band} value={bandValue(band)}>
                All {toTitleCase(band)}
              </option>
            ))}
          </optgroup>
          {categoriesByBand.map(({ band, names }) => (
            <optgroup key={band} label={toTitleCase(band)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
          {uncategorizedCount > 0 && <option value={UNCATEGORIZED}>Uncategorized (older rows)</option>}
        </select>
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
