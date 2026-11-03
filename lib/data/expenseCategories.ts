import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/lib/types";

export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expense_categories").select("*").order("name");
  if (error) throw new Error(`Failed to load expense categories: ${error.message}`);
  return data ?? [];
}
