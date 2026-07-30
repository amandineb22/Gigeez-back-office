"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS, type Channel } from "@/lib/types";

export interface FormState {
  error: string | null;
}

function parseSaleForm(formData: FormData) {
  return {
    variant_id: String(formData.get("variant_id") ?? ""),
    sale_date: String(formData.get("sale_date") ?? ""),
    quantity: Number(formData.get("quantity")),
    unit_price: Number(formData.get("unit_price")),
    channel: String(formData.get("channel") ?? "") as Channel,
    payment_method: String(formData.get("payment_method") ?? "other"),
    discount: Number(formData.get("discount") ?? 0),
    is_refund: formData.get("is_refund") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateSaleForm(fields: ReturnType<typeof parseSaleForm>): string | null {
  if (!fields.variant_id) return "Choose a SKU.";
  if (!fields.sale_date) return "Choose a date.";
  if (!fields.channel || !CHANNELS.includes(fields.channel as (typeof CHANNELS)[number])) return "Choose a channel.";
  if (!Number.isFinite(fields.quantity) || fields.quantity <= 0) return "Quantity must be a positive number.";
  if (!Number.isFinite(fields.unit_price) || fields.unit_price < 0) return "Unit price must be zero or more.";
  if (!Number.isFinite(fields.discount) || fields.discount < 0) return "Discount must be zero or more.";
  return null;
}

function revalidateSalesPages() {
  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/reports");
}

export async function createSale(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseSaleForm(formData);
  const validationError = validateSaleForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();

  if (!fields.is_refund) {
    const { data: variant } = await supabase
      .from("variants")
      .select("stock_quantity")
      .eq("id", fields.variant_id)
      .single();
    if (variant && variant.stock_quantity < fields.quantity) {
      return { error: `Only ${variant.stock_quantity} unit(s) in stock for this SKU.` };
    }
  }

  const { error } = await supabase.from("sales").insert(fields);
  if (error) return { error: error.message };

  await supabase.rpc("adjust_variant_stock", {
    p_variant_id: fields.variant_id,
    p_delta: fields.is_refund ? fields.quantity : -fields.quantity,
  });

  revalidateSalesPages();
  redirect("/sales");
}

export async function updateSale(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseSaleForm(formData);
  const validationError = validateSaleForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("sales")
    .select("variant_id, quantity, is_refund")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return { error: "This sale could not be found." };

  const { error } = await supabase.from("sales").update(fields).eq("id", id);
  if (error) return { error: error.message };

  // Undo the stock effect of the old values, then apply the new ones —
  // handles quantity changes, refund-flag toggles, and even switching SKU.
  const undoDelta = existing.is_refund ? -existing.quantity : existing.quantity;
  await supabase.rpc("adjust_variant_stock", { p_variant_id: existing.variant_id, p_delta: undoDelta });
  const applyDelta = fields.is_refund ? fields.quantity : -fields.quantity;
  await supabase.rpc("adjust_variant_stock", { p_variant_id: fields.variant_id, p_delta: applyDelta });

  revalidateSalesPages();
  redirect("/sales");
}

export async function deleteSale(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("sales").select("variant_id, quantity, is_refund").eq("id", id).single();

  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    const undoDelta = existing.is_refund ? -existing.quantity : existing.quantity;
    await supabase.rpc("adjust_variant_stock", { p_variant_id: existing.variant_id, p_delta: undoDelta });
  }

  revalidateSalesPages();
}
