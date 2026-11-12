"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/actions/stock";
import { LocationInput } from "../LocationInput";

const initialState: FormState = { error: null };

/** Inline editor for one physical piece: its location and a note. */
export function PieceForm({
  action,
  unitId,
  location,
  notes,
  locations,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  unitId: string;
  location: string;
  notes: string | null;
  locations: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <LocationInput
        id={`loc-${unitId}`}
        name="location"
        locations={locations}
        defaultValue={location}
        className="w-40 py-1.5"
      />
      <Input name="notes" defaultValue={notes ?? ""} placeholder="Note" className="w-56 py-1.5" />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
