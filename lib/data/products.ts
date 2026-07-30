import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product, Variant } from "@/lib/types";

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return data ?? [];
}

export async function getProductWithVariants(id: string): Promise<{ product: Product; variants: Variant[] } | null> {
  const supabase = await createClient();
  const [{ data: product, error: productError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("variants").select("*").eq("product_id", id).order("size"),
  ]);

  if (productError || !product) return null;
  if (variantsError) throw new Error(`Failed to load variants: ${variantsError.message}`);
  return { product, variants: variants ?? [] };
}
