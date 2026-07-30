"use client";

import { useActionState } from "react";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/goals";
import type { Goal } from "@/lib/types";

const initialState: FormState = { error: null };

export function GoalForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Goal>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Metric" htmlFor="metric_type">
          <Select id="metric_type" name="metric_type" required defaultValue={defaultValues?.metric_type ?? "revenue"}>
            <option value="revenue">Revenue</option>
            <option value="profit">Profit</option>
            <option value="orders">Orders</option>
            <option value="aov">Average order value</option>
          </Select>
        </FormField>
        <FormField label="Target" htmlFor="target_amount">
          <Input
            id="target_amount"
            name="target_amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaultValues?.target_amount ?? ""}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Period" htmlFor="period_type">
          <Select id="period_type" name="period_type" required defaultValue={defaultValues?.period_type ?? "monthly"}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </FormField>
        <FormField label="Period start" htmlFor="period_start" hint="e.g. the 1st of the month/quarter/year">
          <Input
            id="period_start"
            name="period_start"
            type="date"
            required
            defaultValue={defaultValues?.period_start ?? new Date().toISOString().slice(0, 10)}
          />
        </FormField>
      </div>

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
