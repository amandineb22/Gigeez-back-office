import { createClient } from "@/lib/supabase/server";
import { deleteMonthlyNote } from "@/lib/actions/journal";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { JournalForm } from "./JournalForm";
import type { MonthlyNote } from "@/lib/types";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("monthly_notes")
    .select("*")
    .order("note_month", { ascending: false });

  const allNotes = (notes ?? []) as MonthlyNote[];
  const editingMonth = month ?? format(new Date(), "yyyy-MM");
  const editingNote = allNotes.find((n) => n.note_month.startsWith(editingMonth));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-ink">Journal</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editingNote ? `Editing ${format(new Date(`${editingMonth}-01`), "MMMM yyyy")}` : "New note"}</CardTitle>
        </CardHeader>
        <JournalForm defaultMonth={editingMonth} defaultContent={editingNote?.content ?? ""} />
      </Card>

      {allNotes.length === 0 ? (
        <EmptyState title="No notes yet" description="Add monthly context above to explain spikes, dips, or one-off events." />
      ) : (
        <div className="space-y-3">
          {allNotes.map((n) => (
            <Card key={n.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-display text-base text-ink">{format(new Date(n.note_month), "MMMM yyyy")}</p>
                <div className="flex gap-1">
                  <LinkButton href={`/journal?month=${n.note_month.slice(0, 7)}`} variant="ghost" size="sm">
                    Edit
                  </LinkButton>
                  <form action={deleteMonthlyNote.bind(null, n.id)}>
                    <ConfirmSubmitButton confirmMessage="Delete this note?">Delete</ConfirmSubmitButton>
                  </form>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink/70">{n.content || "—"}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
