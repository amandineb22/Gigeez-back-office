import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/types";

export async function getAllSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw new Error(`Failed to load suppliers: ${error.message}`);
  return data ?? [];
}
