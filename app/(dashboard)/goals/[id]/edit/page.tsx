import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateGoal } from "@/lib/actions/goals";
import { GoalForm } from "../../GoalForm";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: goal } = await supabase.from("goals").select("*").eq("id", id).single();
  if (!goal) notFound();

  const action = updateGoal.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit goal</h1>
      <GoalForm action={action} defaultValues={goal} submitLabel="Save changes" />
    </div>
  );
}
