import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/utils";
import type { SaleWithDetails } from "@/lib/types";

/** Sales joined with variant/product + computed revenue/cogs/profit, from the v_sales view. */
export async function getSalesInRange(range: DateRange): Promise<SaleWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_sales")
    .select("*")
    .gte("sale_date", range.from)
    .lte("sale_date", range.to)
    .order("sale_date", { ascending: false });

  if (error) throw new Error(`Failed to load sales: ${error.message}`);
  return data ?? [];
}

/** All-time sales, used where a full history is needed (e.g. dead-stock last-sale lookups). */
export async function getAllSales(): Promise<SaleWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_sales").select("*").order("sale_date", { ascending: false });
  if (error) throw new Error(`Failed to load sales: ${error.message}`);
  return data ?? [];
}
