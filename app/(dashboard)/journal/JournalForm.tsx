"use client";

import { useActionState } from "react";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveMonthlyNote, type FormState } from "@/lib/actions/journal";

const initialState: FormState = { error: null };

export function JournalForm({ defaultMonth, defaultContent }: { defaultMonth: string; defaultContent: string }) {
  const [state, formAction, pending] = useActionState(saveMonthlyNote, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField label="Month" htmlFor="note_month">
        <Input id="note_month" name="note_month" type="month" required defaultValue={defaultMonth} />
      </FormField>
      <FormField label="Notes" htmlFor="content" hint="Context for the numbers this month — promotions, disruptions, big wins.">
        <Textarea id="content" name="content" rows={5} defaultValue={defaultContent} />
      </FormField>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}
