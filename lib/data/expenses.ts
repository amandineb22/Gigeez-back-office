import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/utils";
import type { Expense } from "@/lib/types";

export async function getExpensesInRange(range: DateRange): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", range.from)
    .lte("expense_date", range.to)
    .order("expense_date", { ascending: false });

  if (error) throw new Error(`Failed to load expenses: ${error.message}`);
  return data ?? [];
}
