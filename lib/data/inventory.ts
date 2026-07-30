import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InventoryRow } from "@/lib/types";

export async function getInventory(): Promise<InventoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_inventory").select("*").order("product_name");
  if (error) throw new Error(`Failed to load inventory: ${error.message}`);
  return data ?? [];
}
