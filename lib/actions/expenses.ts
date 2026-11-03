"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { EXPENSE_CATEGORY_BANDS, type CostType, type ExpenseCategoryBand } from "@/lib/types";
import { CURRENCIES, convertToBase, type Currency } from "@/lib/currency";

export interface FormState {
  error: string | null;
}

/** Sentinel value for the "+ Add a new category…" option on the form's Category select. */
const NEW_CATEGORY_VALUE = "__new__";

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
    category: String(formData.get("category") ?? ""),
    new_category_name: String(formData.get("new_category_name") ?? "").trim(),
    new_category_band: String(formData.get("new_category_band") ?? "") as ExpenseCategoryBand,
    amount,
    cost_type: String(formData.get("cost_type") ?? "variable") as CostType,
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateExpenseForm(fields: ReturnType<typeof parseExpenseForm>): string | null {
  if (!fields.expense_date) return "Choose a date.";
  if (!fields.category) return "Choose a category.";
  if (fields.category === NEW_CATEGORY_VALUE) {
    if (!fields.new_category_name) return "Give the new category a name.";
    if (!EXPENSE_CATEGORY_BANDS.includes(fields.new_category_band)) return "Choose a band for the new category.";
  }
  if (!Number.isFinite(fields.amount) || fields.amount < 0) return "Amount must be zero or more.";
  if (fields.cost_type !== "fixed" && fields.cost_type !== "variable") return "Choose fixed or variable.";
  return null;
}

/**
 * Resolves the submitted category to a {name, band} pair, creating a new
 * governed category first if the form's "+ Add a new category…" option was
 * used. The Category field is always picked from expense_categories — this
 * is the only place a new one gets added, never free text on the expense row
 * itself.
 */
async function resolveCategory(
  supabase: SupabaseClient<Database>,
  fields: ReturnType<typeof parseExpenseForm>
): Promise<{ name: string; band: ExpenseCategoryBand } | { error: string }> {
  if (fields.category === NEW_CATEGORY_VALUE) {
    const { error } = await supabase
      .from("expense_categories")
      .upsert({ name: fields.new_category_name, band: fields.new_category_band }, { onConflict: "name" });
    if (error) return { error: error.message };
    return { name: fields.new_category_name, band: fields.new_category_band };
  }

  const { data, error } = await supabase
    .from("expense_categories")
    .select("name, band")
    .eq("name", fields.category)
    .single();
  if (error || !data) return { error: "That category no longer exists — pick another one." };
  return { name: data.name, band: data.band };
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
  const category = await resolveCategory(supabase, fields);
  if ("error" in category) return { error: category.error };

  const { error } = await supabase.from("expenses").insert({
    expense_date: fields.expense_date,
    category: category.name,
    cost_band: category.band,
    amount: fields.amount,
    cost_type: fields.cost_type,
    vendor: fields.vendor,
    notes: fields.notes,
  });
  if (error) return { error: error.message };

  revalidateExpensePages();
  redirect("/expenses");
}

export async function updateExpense(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseExpenseForm(formData);
  const validationError = validateExpenseForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const category = await resolveCategory(supabase, fields);
  if ("error" in category) return { error: category.error };

  const { error } = await supabase
    .from("expenses")
    .update({
      expense_date: fields.expense_date,
      category: category.name,
      cost_band: category.band,
      amount: fields.amount,
      cost_type: fields.cost_type,
      vendor: fields.vendor,
      notes: fields.notes,
    })
    .eq("id", id);
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
