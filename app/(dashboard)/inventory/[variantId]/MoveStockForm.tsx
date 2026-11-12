"use client";

import { useActionState } from "react";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/stock";
import { LocationInput } from "../LocationInput";

const initialState: FormState = { error: null };

/**
 * One line to change where pieces are. With a single piece it's just
 * "Location [WHSE] Save"; with more it reads "Move [1] from [WHSE] to [ ] Move".
 */
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
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const single = total === 1;

  return (
    <form action={formAction} className="space-y-2">
      {single ? (
        <div className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="from" value={entries[0][0]} />
          <input type="hidden" name="count" value={1} />
          <span className="text-sm text-ink/60">Location</span>
          <LocationInput id="move-to" name="to" locations={locations} defaultValue={entries[0][0]} className="w-56" />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink/60">
          <span>Move</span>
          <Input name="count" type="number" min={1} max={total} step={1} required defaultValue={1} className="w-20" />
          <span>from</span>
          {entries.length === 1 ? (
            <>
              <input type="hidden" name="from" value={entries[0][0]} />
              <span className="font-medium text-ink">{entries[0][0]}</span>
            </>
          ) : (
            <Select name="from" required defaultValue={entries[0][0]} className="w-48">
              {entries.map(([loc, count]) => (
                <option key={loc} value={loc}>
                  {loc} ({count})
                </option>
              ))}
            </Select>
          )}
          <span>to</span>
          <LocationInput id="move-to" name="to" locations={locations} className="w-56" />
          <Button type="submit" disabled={pending}>
            {pending ? "Moving…" : "Move"}
          </Button>
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
