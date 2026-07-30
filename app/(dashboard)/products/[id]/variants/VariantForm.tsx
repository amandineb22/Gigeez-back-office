"use client";

import { useActionState } from "react";
import { FormField, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/variants";
import type { Variant } from "@/lib/types";

const initialState: FormState = { error: null };

export function VariantForm({
  action,
  productId,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  productId: string;
  defaultValues?: Partial<Variant>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="product_id" value={productId} />

      <FormField label="SKU code" htmlFor="sku">
        <Input id="sku" name="sku" required defaultValue={defaultValues?.sku ?? ""} placeholder="e.g. LWD-BLU-M" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Size" htmlFor="size">
          <Input id="size" name="size" required defaultValue={defaultValues?.size ?? ""} placeholder="e.g. M" />
        </FormField>
        <FormField label="Color" htmlFor="color">
          <Input id="color" name="color" required defaultValue={defaultValues?.color ?? ""} placeholder="e.g. Blue" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Stock on hand" htmlFor="stock_quantity">
          <Input
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={defaultValues?.stock_quantity ?? 0}
          />
        </FormField>
        <FormField label="Reorder point" htmlFor="reorder_point" hint="Alert when stock falls to this level">
          <Input
            id="reorder_point"
            name="reorder_point"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={defaultValues?.reorder_point ?? 5}
          />
        </FormField>
      </div>

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
