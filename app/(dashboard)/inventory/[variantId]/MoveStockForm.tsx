"use client";

import { useActionState } from "react";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/stock";
import { LocationInput } from "../LocationInput";

const initialState: FormState = { error: null };

export function MoveStockForm({
  action,
  currentLocations,
  locations,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  /** location -> pieces of this SKU there now */
  currentLocations: Record<string, number>;
  locations: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const entries = Object.entries(currentLocations);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem_1fr_auto] sm:items-end">
        <FormField label="From" htmlFor="move-from">
          <Select id="move-from" name="from" required defaultValue={entries[0]?.[0] ?? ""}>
            {entries.map(([loc, count]) => (
              <option key={loc} value={loc}>
                {loc} ({count})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="How many" htmlFor="move-count">
          <Input id="move-count" name="count" type="number" min={1} step={1} required defaultValue={1} />
        </FormField>
        <FormField label="To" htmlFor="move-to">
          <LocationInput id="move-to" name="to" locations={locations} placeholder="e.g. PORTO V" />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? "Moving…" : "Move"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
