import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VariantWithProduct } from "@/lib/types";

export async function getAllVariantsWithProduct(): Promise<VariantWithProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variants")
    .select("*, product:products(id, name, category, base_cost)")
    .order("sku");

  if (error) throw new Error(`Failed to load variants: ${error.message}`);
  return (data ?? []) as unknown as VariantWithProduct[];
}
