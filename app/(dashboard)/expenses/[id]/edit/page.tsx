import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateExpense } from "@/lib/actions/expenses";
import { ExpenseForm } from "../../ExpenseForm";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: expense } = await supabase.from("expenses").select("*").eq("id", id).single();
  if (!expense) notFound();

  const action = updateExpense.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit expense</h1>
      <ExpenseForm action={action} defaultValues={expense} submitLabel="Save changes" />
    </div>
  );
}
