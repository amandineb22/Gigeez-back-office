import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InventoryRow, StockUnitWithDetails } from "@/lib/types";

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
