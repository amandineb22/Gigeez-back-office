"use client";

import { useActionState } from "react";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/suppliers";
import type { Supplier } from "@/lib/types";

const initialState: FormState = { error: null };

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Supplier>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <FormField label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Contact" htmlFor="contact" hint="Email or phone">
          <Input id="contact" name="contact" defaultValue={defaultValues?.contact ?? ""} />
        </FormField>
        <FormField label="Lead time (days)" htmlFor="lead_time_days" hint="Optional">
          <Input
            id="lead_time_days"
            name="lead_time_days"
            type="number"
            min={0}
            step={1}
            defaultValue={defaultValues?.lead_time_days ?? ""}
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
