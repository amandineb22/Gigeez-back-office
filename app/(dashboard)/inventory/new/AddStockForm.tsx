"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { addStock, type FormState } from "@/lib/actions/stock";
import { LocationInput } from "../LocationInput";

export interface SkuOption {
  variant_id: string;
  product_name: string;
  label: string;
}

const initialState: FormState = { error: null };

export function AddStockForm({
  skus,
  locations,
  defaultVariantId,
}: {
  skus: SkuOption[];
  locations: string[];
  defaultVariantId?: string;
}) {
  const [state, formAction, pending] = useActionState(addStock, initialState);

  const byProduct = new Map<string, SkuOption[]>();
  for (const s of skus) {
    const list = byProduct.get(s.product_name) ?? [];
    list.push(s);
    byProduct.set(s.product_name, list);
  }

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <FormField
        label="SKU"
        htmlFor="variant_id"
        hint="Not listed? Add the model under Products first."
      >
        <Select id="variant_id" name="variant_id" required defaultValue={defaultVariantId ?? ""}>
          <option value="" disabled>
            Choose a SKU…
          </option>
          {Array.from(byProduct.entries()).map(([product, options]) => (
            <optgroup key={product} label={product}>
              {options.map((o) => (
                <option key={o.variant_id} value={o.variant_id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Number of pieces" htmlFor="quantity">
          <Input id="quantity" name="quantity" type="number" min={1} max={200} step={1} required defaultValue={1} />
        </FormField>
        <FormField label="Location" htmlFor="location" hint="Pick one or type a new one">
          <LocationInput id="location" name="location" locations={locations} defaultValue="WHSE" />
        </FormField>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add stock"}
        </Button>
        <Link href="/inventory" className="text-sm text-ink/50 hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
