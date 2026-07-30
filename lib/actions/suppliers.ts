"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

function parseSupplierForm(formData: FormData) {
  const leadTimeRaw = String(formData.get("lead_time_days") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim() || null,
    lead_time_days: leadTimeRaw ? Number(leadTimeRaw) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateSupplierForm(fields: ReturnType<typeof parseSupplierForm>): string | null {
  if (!fields.name) return "Give the supplier a name.";
  if (fields.lead_time_days !== null && (!Number.isInteger(fields.lead_time_days) || fields.lead_time_days < 0)) {
    return "Lead time must be a whole number of days.";
  }
  return null;
}

export async function createSupplier(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseSupplierForm(formData);
  const validationError = validateSupplierForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert(fields);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseSupplierForm(formData);
  const validationError = validateSupplierForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
}
