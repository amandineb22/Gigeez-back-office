"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

/** One note per calendar month — upserts so re-saving the same month edits it in place. */
export async function saveMonthlyNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const monthInput = String(formData.get("note_month") ?? ""); // yyyy-MM from <input type="month">
  const content = String(formData.get("content") ?? "").trim();

  if (!monthInput) return { error: "Choose a month." };
  const note_month = `${monthInput}-01`;

  const supabase = await createClient();
  const { error } = await supabase.from("monthly_notes").upsert({ note_month, content }, { onConflict: "note_month" });
  if (error) return { error: error.message };

  revalidatePath("/journal");
  return { error: null };
}

export async function deleteMonthlyNote(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("monthly_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
}
