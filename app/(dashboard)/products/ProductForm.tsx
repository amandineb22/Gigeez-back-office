"use client";

import { useActionState } from "react";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/products";
import type { Product } from "@/lib/types";

const initialState: FormState = { error: null };

export function ProductForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Product>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <FormField label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} placeholder="e.g. Linen Wrap Dress" />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category">
          <Input
            id="category"
            name="category"
            list="category-suggestions"
            required
            defaultValue={defaultValues?.category ?? ""}
            placeholder="e.g. Dresses"
          />
          <datalist id="category-suggestions">
            <option value="Dresses" />
            <option value="Tops" />
            <option value="Bottoms" />
            <option value="Outerwear" />
            <option value="Accessories" />
          </datalist>
        </FormField>
        <FormField label="Base cost / unit ($)" htmlFor="base_cost" hint="Your COGS per unit">
          <Input
            id="base_cost"
            name="base_cost"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaultValues?.base_cost ?? ""}
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
