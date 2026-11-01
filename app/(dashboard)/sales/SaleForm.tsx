"use client";

import { useActionState, useMemo, useState } from "react";
import { FormField, Input, Select, Checkbox, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/sales";
import type { Reseller, Sale, VariantWithProduct } from "@/lib/types";
import { SALE_FORM_CHANNELS, PAYMENT_METHODS } from "@/lib/types";
import { toTitleCase, formatPercent } from "@/lib/utils";
import { CURRENCIES, convertFromBase, type Currency } from "@/lib/currency";

const initialState: FormState = { error: null };

export function SaleForm({
  action,
  variants,
  resellers,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  variants: VariantWithProduct[];
  resellers: Reseller[];
  defaultValues?: Partial<Sale>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const defaultReseller = useMemo(
    () => resellers.find((r) => r.id === defaultValues?.reseller_id) ?? null,
    [resellers, defaultValues?.reseller_id]
  );
  const [resellerId, setResellerId] = useState(defaultValues?.reseller_id ?? "");
  const [currency, setCurrency] = useState<Currency>(defaultReseller?.currency ?? "QAR");

  const selectedReseller = resellers.find((r) => r.id === resellerId) ?? null;

  function handleResellerChange(id: string) {
    setResellerId(id);
    const reseller = resellers.find((r) => r.id === id);
    if (reseller) setCurrency(reseller.currency);
  }

  // Existing amounts are stored in QAR; show them converted into whichever
  // currency is currently selected so editing a sale doesn't require mental math.
  const defaultUnitPrice =
    defaultValues?.unit_price != null ? convertFromBase(defaultValues.unit_price, currency) : "";
  const defaultRetailPrice =
    defaultValues?.retail_unit_price != null ? convertFromBase(defaultValues.retail_unit_price, currency) : "";
  const defaultDiscount = defaultValues?.discount != null ? convertFromBase(defaultValues.discount, currency) : 0;

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <FormField label="SKU" htmlFor="variant_id">
        <Select id="variant_id" name="variant_id" required defaultValue={defaultValues?.variant_id ?? ""}>
          <option value="" disabled>
            Select a SKU…
          </option>
          {variants.map((v) => {
            const attrs = [v.length, v.style, v.material].filter(Boolean).join(" · ");
            return (
              <option key={v.id} value={v.id}>
                {v.product.name} — {v.size}/{v.color}
                {attrs ? ` · ${attrs}` : ""} ({v.sku}) · {v.stock_quantity} in stock
              </option>
            );
          })}
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
        <FormField
          label="Channel"
          htmlFor="channel"
          hint={defaultValues?.channel === "unknown" ? "Imported without a recorded channel — pick the real one if you know it" : undefined}
        >
          <Select id="channel" name="channel" required defaultValue={defaultValues?.channel ?? ""}>
            <option value="" disabled>
              Select…
            </option>
            {defaultValues?.channel === "unknown" && <option value="unknown">Unknown</option>}
            {SALE_FORM_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {toTitleCase(c)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Reseller"
          htmlFor="reseller_id"
          hint="Who this piece sold through — leave as Direct for a walk-in/own-channel sale"
        >
          <Select id="reseller_id" name="reseller_id" value={resellerId} onChange={(e) => handleResellerChange(e.target.value)}>
            <option value="">Direct sale (Gigeez keeps 100%)</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — Gigeez keeps {formatPercent(r.gigeez_share_pct, 2)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Currency" htmlFor="currency" hint="What you're entering the prices below in">
          <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Quantity" htmlFor="quantity">
          <Input id="quantity" name="quantity" type="number" min={1} step={1} required defaultValue={defaultValues?.quantity ?? 1} />
        </FormField>
        <FormField
          label={`Unit price Gigeez receives (${currency})`}
          htmlFor="unit_price"
          hint={
            selectedReseller
              ? `${selectedReseller.name} invoices in ${selectedReseller.currency} — this is the net amount owed to Gigeez, not the retail price`
              : "The full amount Gigeez keeps for a direct sale"
          }
        >
          <Input
            id="unit_price"
            name="unit_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaultUnitPrice}
          />
        </FormField>
      </div>

      <FormField
        label={`Retail price (${currency})`}
        htmlFor="retail_unit_price"
        hint="Optional — what the end customer paid, for reference against the reseller's invoice. Never used in revenue/profit."
      >
        <Input id="retail_unit_price" name="retail_unit_price" type="number" min={0} step="0.01" defaultValue={defaultRetailPrice} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={`Discount (${currency})`} htmlFor="discount" hint="Optional line-level discount">
          <Input id="discount" name="discount" type="number" min={0} step="0.01" defaultValue={defaultDiscount} />
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
