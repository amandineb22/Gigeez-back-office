import { createExpense } from "@/lib/actions/expenses";
import { getAllExpenseCategories } from "@/lib/data/expenseCategories";
import { ExpenseForm } from "../ExpenseForm";

export default async function NewExpensePage() {
  const categories = await getAllExpenseCategories();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add expense</h1>
      <ExpenseForm action={createExpense} categories={categories} submitLabel="Add expense" />
    </div>
  );
}
