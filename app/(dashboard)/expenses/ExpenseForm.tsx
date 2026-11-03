"use client";

import { useActionState, useState } from "react";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/expenses";
import type { Expense, ExpenseCategory, ExpenseCategoryBand } from "@/lib/types";
import { EXPENSE_CATEGORY_BANDS } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";
import { BASE_CURRENCY, CURRENCIES, convertToBase, formatMoney, type Currency } from "@/lib/currency";

const initialState: FormState = { error: null };

const NEW_CATEGORY_VALUE = "__new__";

export function ExpenseForm({
  action,
  categories,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  categories: ExpenseCategory[];
  defaultValues?: Partial<Expense>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  // Amounts are stored in QAR. Typing one in euros or dollars is a convenience
  // for invoices that arrive that way; the server does the conversion, and the
  // preview below the field shows what will actually be saved.
  const [currency, setCurrency] = useState<Currency>(BASE_CURRENCY);
  const [amount, setAmount] = useState(String(defaultValues?.amount ?? ""));
  const [category, setCategory] = useState(defaultValues?.category ?? "");
  const isAddingCategory = category === NEW_CATEGORY_VALUE;

  const entered = Number(amount);
  const showsConversion = currency !== BASE_CURRENCY && Number.isFinite(entered) && amount.trim() !== "";

  const categoriesByBand = EXPENSE_CATEGORY_BANDS.map((band) => ({
    band,
    options: categories.filter((c) => c.band === band),
  })).filter((group) => group.options.length > 0);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Date" htmlFor="expense_date">
          <Input
            id="expense_date"
            name="expense_date"
            type="date"
            required
            defaultValue={defaultValues?.expense_date ?? new Date().toISOString().slice(0, 10)}
          />
        </FormField>
        <FormField
          label="Amount"
          htmlFor="amount"
          hint={showsConversion ? `Saves as ${formatMoney(convertToBase(entered, currency))}` : "Saved in QAR"}
        >
          <div className="flex gap-2">
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Select
              id="currency"
              name="currency"
              aria-label="Currency of the amount entered"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-24 shrink-0"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category" hint="Matches your profit and loss sheet's categories">
          <Select id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>
              Select…
            </option>
            {categoriesByBand.map(({ band, options }) => (
              <optgroup key={band} label={toTitleCase(band)}>
                {options.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ Add a new category…</option>
          </Select>
        </FormField>
        <FormField label="Type" htmlFor="cost_type" hint="Fixed = recurs regardless of sales volume">
          <Select id="cost_type" name="cost_type" required defaultValue={defaultValues?.cost_type ?? "variable"}>
            <option value="variable">Variable</option>
            <option value="fixed">Fixed</option>
          </Select>
        </FormField>
      </div>

      {isAddingCategory && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-dashed border-ink/15 p-4 sm:grid-cols-2">
          <FormField label="New category name" htmlFor="new_category_name">
            <Input id="new_category_name" name="new_category_name" required placeholder="e.g. Studio Photography" />
          </FormField>
          <FormField label="Band" htmlFor="new_category_band" hint="Which group it belongs to on the P&L sheet">
            <Select id="new_category_band" name="new_category_band" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {EXPENSE_CATEGORY_BANDS.map((band) => (
                <option key={band} value={band}>
                  {toTitleCase(band)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      <FormField label="Vendor" htmlFor="vendor" hint="Optional">
        <Input id="vendor" name="vendor" defaultValue={defaultValues?.vendor ?? ""} />
      </FormField>

      <FormField label="Notes" htmlFor="notes" hint="Optional">
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} />
      </FormField>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
