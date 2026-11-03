"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS, type Channel } from "@/lib/types";
import { CURRENCIES, convertToBase, type Currency } from "@/lib/currency";

export interface FormState {
  error: string | null;
}

/**
 * Prices are entered in whichever currency the reseller invoices in (see the
 * "Currency" field on SaleForm) but stored in QAR like every other money
 * column — this is where that conversion happens, once, before the insert.
 */
function parseSaleForm(formData: FormData) {
  const currency = String(formData.get("currency") ?? "QAR") as Currency;
  const unitPriceRaw = Number(formData.get("unit_price"));
  const discountRaw = Number(formData.get("discount") ?? 0);
  const retailPriceRaw = String(formData.get("retail_unit_price") ?? "").trim();
  const resellerId = String(formData.get("reseller_id") ?? "").trim();

  return {
    // Not a sales column — only used above to convert the raw inputs to QAR,
    // kept here so validateSaleForm can still check it was a real currency.
    currency,
    variant_id: String(formData.get("variant_id") ?? ""),
    sale_date: String(formData.get("sale_date") ?? ""),
    reseller_id: resellerId || null,
    quantity: Number(formData.get("quantity")),
    unit_price: Number.isFinite(unitPriceRaw) ? convertToBase(unitPriceRaw, currency) : unitPriceRaw,
    retail_unit_price: retailPriceRaw ? convertToBase(Number(retailPriceRaw), currency) : null,
    channel: String(formData.get("channel") ?? "") as Channel,
    payment_method: String(formData.get("payment_method") ?? "other"),
    discount: Number.isFinite(discountRaw) ? convertToBase(discountRaw, currency) : discountRaw,
    is_refund: formData.get("is_refund") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

/** sales columns only — drops the `currency` field parseSaleForm uses for conversion but which isn't a DB column. */
function toSalesRow(fields: ReturnType<typeof parseSaleForm>) {
  const { currency: _currency, ...row } = fields;
  return row;
}

function validateSaleForm(fields: ReturnType<typeof parseSaleForm>): string | null {
  if (!fields.variant_id) return "Choose a SKU.";
  if (!fields.sale_date) return "Choose a date.";
  if (!CURRENCIES.includes(fields.currency)) return "Choose a currency.";
  if (!fields.channel || !CHANNELS.includes(fields.channel as (typeof CHANNELS)[number])) return "Choose a channel.";
  if (!Number.isFinite(fields.quantity) || fields.quantity <= 0) return "Quantity must be a positive number.";
  if (!Number.isFinite(fields.unit_price) || fields.unit_price < 0) return "Unit price must be zero or more.";
  if (fields.retail_unit_price !== null && !Number.isFinite(fields.retail_unit_price)) return "Retail price must be a number.";
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

  const { error } = await supabase.from("sales").insert(toSalesRow(fields));
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

  const { error } = await supabase.from("sales").update(toSalesRow(fields)).eq("id", id);
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
