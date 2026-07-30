"use client";

import { useActionState } from "react";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/expenses";
import type { Expense } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

const initialState: FormState = { error: null };

export function ExpenseForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Expense>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

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
        <FormField label="Amount ($)" htmlFor="amount">
          <Input id="amount" name="amount" type="number" min={0} step="0.01" required defaultValue={defaultValues?.amount ?? ""} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category">
          <Select id="category" name="category" required defaultValue={defaultValues?.category ?? ""}>
            <option value="" disabled>
              Select…
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {toTitleCase(c)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Type" htmlFor="cost_type" hint="Fixed = recurs regardless of sales volume">
          <Select id="cost_type" name="cost_type" required defaultValue={defaultValues?.cost_type ?? "variable"}>
            <option value="variable">Variable</option>
            <option value="fixed">Fixed</option>
          </Select>
        </FormField>
      </div>

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
