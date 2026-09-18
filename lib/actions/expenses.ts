"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES, type CostType, type ExpenseCategory } from "@/lib/types";
import { CURRENCIES, convertToBase, type Currency } from "@/lib/currency";

export interface FormState {
  error: string | null;
}

/**
 * Amounts are always stored in QAR. The form lets an amount be typed in EUR or
 * USD for convenience — a supplier invoice in euros, say — and it is converted
 * here, on the server, so nothing but QAR ever reaches the database.
 */
function parseExpenseForm(formData: FormData) {
  const rawCurrency = String(formData.get("currency") ?? "QAR").toUpperCase();
  const currency = (CURRENCIES as readonly string[]).includes(rawCurrency)
    ? (rawCurrency as Currency)
    : "QAR";
  const entered = Number(formData.get("amount"));
  const amount = Number.isFinite(entered) ? Number(convertToBase(entered, currency).toFixed(2)) : entered;

  return {
    expense_date: String(formData.get("expense_date") ?? ""),
    category: String(formData.get("category") ?? "") as ExpenseCategory,
    amount,
    cost_type: String(formData.get("cost_type") ?? "variable") as CostType,
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateExpenseForm(fields: ReturnType<typeof parseExpenseForm>): string | null {
  if (!fields.expense_date) return "Choose a date.";
  if (!EXPENSE_CATEGORIES.includes(fields.category as (typeof EXPENSE_CATEGORIES)[number])) return "Choose a category.";
  if (!Number.isFinite(fields.amount) || fields.amount < 0) return "Amount must be zero or more.";
  if (fields.cost_type !== "fixed" && fields.cost_type !== "variable") return "Choose fixed or variable.";
  return null;
}

function revalidateExpensePages() {
  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function createExpense(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseExpenseForm(formData);
  const validationError = validateExpenseForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert(fields);
  if (error) return { error: error.message };

  revalidateExpensePages();
  redirect("/expenses");
}

export async function updateExpense(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseExpenseForm(formData);
  const validationError = validateExpenseForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidateExpensePages();
  redirect("/expenses");
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateExpensePages();
}
