"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, type Currency } from "@/lib/currency";
import type { ResellerType } from "@/lib/types";

export interface FormState {
  error: string | null;
}

const RESELLER_TYPES: ResellerType[] = ["consignment", "wholesale"];

function parseResellerForm(formData: FormData) {
  const binLocationsRaw = String(formData.get("bin_locations") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "") as ResellerType,
    currency: String(formData.get("currency") ?? "") as Currency,
    gigeez_share_pct: Number(formData.get("gigeez_share_pct")),
    bin_locations: binLocationsRaw
      ? binLocationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateResellerForm(fields: ReturnType<typeof parseResellerForm>): string | null {
  if (!fields.name) return "Give the reseller a name.";
  if (!RESELLER_TYPES.includes(fields.type)) return "Choose a reseller type.";
  if (!CURRENCIES.includes(fields.currency)) return "Choose a currency.";
  if (!Number.isFinite(fields.gigeez_share_pct) || fields.gigeez_share_pct <= 0 || fields.gigeez_share_pct > 100) {
    return "Gigeez's share must be a percentage between 0 and 100.";
  }
  return null;
}

export async function createReseller(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseResellerForm(formData);
  const validationError = validateResellerForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("resellers").insert(fields);
  if (error) return { error: error.message };

  revalidatePath("/resellers");
  redirect("/resellers");
}

export async function updateReseller(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseResellerForm(formData);
  const validationError = validateResellerForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("resellers").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/resellers");
  revalidatePath("/sales");
  redirect("/resellers");
}

export async function deleteReseller(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("resellers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/resellers");
}
