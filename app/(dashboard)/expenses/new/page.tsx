import { createExpense } from "@/lib/actions/expenses";
import { ExpenseForm } from "../ExpenseForm";

export default function NewExpensePage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add expense</h1>
      <ExpenseForm action={createExpense} submitLabel="Add expense" />
    </div>
  );
}
