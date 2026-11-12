"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

/**
 * Locations are free text (a new boutique needs no code change), but typing
 * "whse" or "Porto v " shouldn't create a second bin next to "WHSE" /
 * "PORTO V". So the typed name is trimmed and, if it matches a location
 * already in use regardless of case, that existing spelling is reused.
 */
async function canonicalLocation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: string
): Promise<string> {
  const typed = raw.trim().replace(/\s+/g, " ");
  if (!typed) return "";
  const [{ data: units }, { data: resellers }] = await Promise.all([
    supabase.from("stock_units").select("bin_location").ilike("bin_location", typed.replace(/[%_\\]/g, "\\$&")).limit(1),
    supabase.from("resellers").select("bin_locations"),
  ]);
  if (units && units.length) return units[0].bin_location;
  for (const r of resellers ?? []) {
    const match = (r.bin_locations ?? []).find((b) => b.toLowerCase() === typed.toLowerCase());
    if (match) return match;
  }
  return typed;
}

function revalidateStock(variantId?: string) {
  revalidatePath("/inventory");
  if (variantId) revalidatePath(`/inventory/${variantId}`);
  revalidatePath("/");
}

/**
 * Adds N new physical pieces of an existing SKU at a location. Keeps the two
 * stock counts in step: one stock_units row per piece (where it is) and the
 * SKU's stock_quantity (how many there are, which sales draw down).
 */
export async function addStock(_prevState: FormState, formData: FormData): Promise<FormState> {
  const variantId = String(formData.get("variant_id") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!variantId) return { error: "Choose which SKU you're adding stock for." };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "Quantity must be a whole number, 1 or more." };
  if (quantity > 200) return { error: "That's more than 200 pieces at once — split it into smaller batches." };

  const supabase = await createClient();
  const location = await canonicalLocation(supabase, String(formData.get("location") ?? ""));
  if (!location) return { error: "Say where the new pieces are (e.g. WHSE)." };

  const rows = Array.from({ length: quantity }, () => ({
    variant_id: variantId,
    bin_location: location,
    status: "in_stock" as const,
    notes,
  }));
  const { error } = await supabase.from("stock_units").insert(rows);
  if (error) return { error: error.message };

  const { error: rpcError } = await supabase.rpc("adjust_variant_stock", { p_variant_id: variantId, p_delta: quantity });
  if (rpcError) return { error: `Pieces added, but the SKU total didn't update: ${rpcError.message}` };

  revalidateStock(variantId);
  redirect(`/inventory/${variantId}?added=${quantity}`);
}

/** Moves `count` pieces of one SKU from one location to another (e.g. WHSE → PORTO V). */
export async function moveStock(variantId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const from = String(formData.get("from") ?? "");
  const count = Number(formData.get("count"));

  if (!from) return { error: "Choose where the pieces are now." };
  if (!Number.isInteger(count) || count < 1) return { error: "Number of pieces must be 1 or more." };

  const supabase = await createClient();
  const to = await canonicalLocation(supabase, String(formData.get("to") ?? ""));
  if (!to) return { error: "Say where the pieces are going." };
  if (to === from) return { error: `Those pieces are already at ${to}.` };

  const { data: units, error: selectError } = await supabase
    .from("stock_units")
    .select("id")
    .eq("variant_id", variantId)
    .eq("status", "in_stock")
    .eq("bin_location", from)
    .order("created_at")
    .limit(count);
  if (selectError) return { error: selectError.message };
  if (!units || units.length < count) {
    return { error: `Only ${units?.length ?? 0} piece(s) of this SKU are at ${from}.` };
  }

  const { error } = await supabase
    .from("stock_units")
    .update({ bin_location: to })
    .in(
      "id",
      units.map((u) => u.id)
    );
  if (error) return { error: error.message };

  revalidateStock(variantId);
  return { error: null };
}

/**
 * Removes a piece that was entered by mistake, lost/damaged, or already sold
 * through the Sales page, keeping the SKU's stock count in step. Not for sales — recording a sale on the
 * Sales page is what tracks revenue.
 */
export async function removeStockUnit(unitId: string, variantId: string) {
  const supabase = await createClient();
  const { data: linkedSale } = await supabase.from("sales").select("id").eq("stock_unit_id", unitId).limit(1);
  if (linkedSale && linkedSale.length) throw new Error("This piece is linked to a sale and can't be removed.");

  const { error } = await supabase.from("stock_units").delete().eq("id", unitId);
  if (error) throw new Error(error.message);

  // A sale recorded on the Sales page already lowered stock_quantity without
  // saying which piece went. If the count is already at (or below) the
  // number of pieces left, this removal is just catching the pieces up, so
  // don't take a second one off the count.
  const [{ count: piecesLeft }, { data: variant }] = await Promise.all([
    supabase
      .from("stock_units")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variantId)
      .eq("status", "in_stock"),
    supabase.from("variants").select("stock_quantity").eq("id", variantId).single(),
  ]);
  if (variant && variant.stock_quantity > (piecesLeft ?? 0)) {
    await supabase.rpc("adjust_variant_stock", { p_variant_id: variantId, p_delta: -1 });
  }

  revalidateStock(variantId);
}

/** Removes one piece of a SKU from a location (the oldest one there). */
export async function removeOneAt(variantId: string, location: string) {
  const supabase = await createClient();
  const { data: units, error } = await supabase
    .from("stock_units")
    .select("id")
    .eq("variant_id", variantId)
    .eq("status", "in_stock")
    .eq("bin_location", location)
    .order("created_at")
    .limit(1);
  if (error) throw new Error(error.message);
  if (!units || !units.length) throw new Error(`No piece of this SKU is at ${location}.`);
  await removeStockUnit(units[0].id, variantId);
}
