"use client";

import { useActionState } from "react";
import { FormField, Input, Select, Checkbox, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/sales";
import type { Sale, VariantWithProduct } from "@/lib/types";
import { CHANNELS, PAYMENT_METHODS } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

const initialState: FormState = { error: null };

export function SaleForm({
  action,
  variants,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  variants: VariantWithProduct[];
  defaultValues?: Partial<Sale>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <FormField label="SKU" htmlFor="variant_id">
        <Select id="variant_id" name="variant_id" required defaultValue={defaultValues?.variant_id ?? ""}>
          <option value="" disabled>
            Select a SKU…
          </option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.product.name} — {v.size}/{v.color} ({v.sku}) · {v.stock_quantity} in stock
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Date" htmlFor="sale_date">
          <Input
            id="sale_date"
            name="sale_date"
            type="date"
            required
            defaultValue={defaultValues?.sale_date ?? new Date().toISOString().slice(0, 10)}
          />
        </FormField>
        <FormField label="Channel" htmlFor="channel">
          <Select id="channel" name="channel" required defaultValue={defaultValues?.channel ?? ""}>
            <option value="" disabled>
              Select…
            </option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {toTitleCase(c)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Quantity" htmlFor="quantity">
          <Input id="quantity" name="quantity" type="number" min={1} step={1} required defaultValue={defaultValues?.quantity ?? 1} />
        </FormField>
        <FormField label="Unit price ($)" htmlFor="unit_price">
          <Input
            id="unit_price"
            name="unit_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaultValues?.unit_price ?? ""}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Discount ($)" htmlFor="discount" hint="Optional line-level discount">
          <Input id="discount" name="discount" type="number" min={0} step="0.01" defaultValue={defaultValues?.discount ?? 0} />
        </FormField>
        <FormField label="Payment method" htmlFor="payment_method">
          <Select id="payment_method" name="payment_method" defaultValue={defaultValues?.payment_method ?? "card"}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {toTitleCase(m)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <Checkbox id="is_refund" name="is_refund" label="This is a refund" defaultChecked={defaultValues?.is_refund} />

      <FormField label="Notes" htmlFor="notes" hint="Optional">
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} />
      </FormField>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
