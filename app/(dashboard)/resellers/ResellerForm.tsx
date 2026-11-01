"use client";

import { useActionState } from "react";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/resellers";
import type { Reseller } from "@/lib/types";
import { CURRENCIES } from "@/lib/currency";

const initialState: FormState = { error: null };

const RESELLER_TYPES = [
  { value: "consignment", label: "Consignment — Gigeez keeps ownership until they sell it" },
  { value: "wholesale", label: "Wholesale — they buy outright" },
] as const;

export function ResellerForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<Reseller>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <FormField label="Name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="type">
          <Select id="type" name="type" required defaultValue={defaultValues?.type ?? ""}>
            <option value="" disabled>
              Select…
            </option>
            {RESELLER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Currency" htmlFor="currency" hint="What they invoice Gigeez in">
          <Select id="currency" name="currency" required defaultValue={defaultValues?.currency ?? "QAR"}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField
        label="Gigeez's share (%)"
        htmlFor="gigeez_share_pct"
        hint="Percentage of the retail/invoice price Gigeez actually keeps after their cut. Use 100 for wholesale, where the invoiced price already is what Gigeez charges."
      >
        <Input
          id="gigeez_share_pct"
          name="gigeez_share_pct"
          type="number"
          min={0.01}
          max={100}
          step="0.01"
          required
          defaultValue={defaultValues?.gigeez_share_pct ?? ""}
        />
      </FormField>

      <FormField
        label="Bin locations"
        htmlFor="bin_locations"
        hint="Optional — comma-separated stock-sheet bin names this reseller corresponds to (e.g. ALYA, MOAJ), for reference only"
      >
        <Input
          id="bin_locations"
          name="bin_locations"
          defaultValue={defaultValues?.bin_locations?.join(", ") ?? ""}
        />
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
