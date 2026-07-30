"use client";

import { useActionState } from "react";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/purchaseOrders";
import type { PurchaseOrder, Supplier, VariantWithProduct } from "@/lib/types";

const initialState: FormState = { error: null };

export function PurchaseOrderForm({
  action,
  variants,
  suppliers,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  variants: VariantWithProduct[];
  suppliers: Supplier[];
  defaultValues?: Partial<PurchaseOrder>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <FormField label="SKU" htmlFor="variant_id">
        <Select id="variant_id" name="variant_id" required defaultValue={defaultValues?.variant_id ?? ""}>
          <option value="" disabled>
            Select a SKU…
          </option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.product.name} — {v.size}/{v.color} ({v.sku})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Supplier" htmlFor="supplier_id" hint="Optional">
        <Select id="supplier_id" name="supplier_id" defaultValue={defaultValues?.supplier_id ?? ""}>
          <option value="">No supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Quantity ordered" htmlFor="quantity_ordered">
          <Input
            id="quantity_ordered"
            name="quantity_ordered"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={defaultValues?.quantity_ordered ?? ""}
          />
        </FormField>
        <FormField label="Unit cost ($)" htmlFor="unit_cost">
          <Input
            id="unit_cost"
            name="unit_cost"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaultValues?.unit_cost ?? ""}
          />
        </FormField>
      </div>

      <FormField label="Expected date" htmlFor="expected_date" hint="Optional">
        <Input id="expected_date" name="expected_date" type="date" defaultValue={defaultValues?.expected_date ?? ""} />
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
