import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/lib/types";

export async function getAllGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("goals").select("*").order("period_start", { ascending: false });
  if (error) throw new Error(`Failed to load goals: ${error.message}`);
  return data ?? [];
}
