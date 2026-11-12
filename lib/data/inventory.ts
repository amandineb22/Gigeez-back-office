import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InventoryRow, StockUnitWithDetails } from "@/lib/types";

// Sample/demo products from the app's seed script (npm run seed) — not part
// of the real Gigeez stock sheet. Hidden on the Stock pages rather than
// deleted, so nothing is lost if a database still has them.
export const DEMO_PRODUCT_NAMES = new Set([
  "Linen Wrap Dress",
  "Organic Cotton Tee",
  "Tailored Wool Trousers",
  "Quilted Field Jacket",
  "Woven Leather Belt",
]);

export async function getInventory(): Promise<InventoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_inventory").select("*").order("product_name");
  if (error) throw new Error(`Failed to load inventory: ${error.message}`);
  return data ?? [];
}

/** Every physical piece currently in stock, with its bin/location — the detailed Stock page view. */
export async function getStockUnits(): Promise<StockUnitWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_stock_units")
    .select("*")
    .eq("status", "in_stock")
    .order("product_name")
    .order("bin_location");
  if (error) throw new Error(`Failed to load stock units: ${error.message}`);
  return data ?? [];
}

/**
 * Every location name already in use — bins that currently hold or once held
 * a piece, plus the bins listed against each reseller — so the add/move
 * forms can suggest them and keep spellings consistent. Sorted with the
 * own warehouse (WHSE) first.
 */
export async function getKnownLocations(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: units, error: unitsError }, { data: resellers, error: resellersError }] = await Promise.all([
    supabase.from("stock_units").select("bin_location"),
    supabase.from("resellers").select("bin_locations"),
  ]);
  if (unitsError) throw new Error(`Failed to load stock locations: ${unitsError.message}`);
  if (resellersError) throw new Error(`Failed to load reseller locations: ${resellersError.message}`);

  const set = new Set<string>(["WHSE"]);
  for (const u of units ?? []) if (u.bin_location && u.bin_location !== "sold") set.add(u.bin_location);
  for (const r of resellers ?? []) for (const b of r.bin_locations ?? []) if (b) set.add(b);
  return Array.from(set).sort((a, b) => (a === "WHSE" ? -1 : b === "WHSE" ? 1 : a.localeCompare(b)));
}

/** Physical pieces of one SKU currently in stock, oldest first. */
export async function getVariantStockUnits(variantId: string): Promise<StockUnitWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_stock_units")
    .select("*")
    .eq("variant_id", variantId)
    .eq("status", "in_stock")
    .order("bin_location")
    .order("created_at");
  if (error) throw new Error(`Failed to load stock units: ${error.message}`);
  return data ?? [];
}
