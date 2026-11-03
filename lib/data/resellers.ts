import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Reseller } from "@/lib/types";

export async function getAllResellers(): Promise<Reseller[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("resellers").select("*").order("name");
  if (error) throw new Error(`Failed to load resellers: ${error.message}`);
  return data ?? [];
}
