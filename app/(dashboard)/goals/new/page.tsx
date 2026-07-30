import { createGoal } from "@/lib/actions/goals";
import { GoalForm } from "../GoalForm";

export default function NewGoalPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add goal</h1>
      <GoalForm action={createGoal} submitLabel="Add goal" />
    </div>
  );
}
