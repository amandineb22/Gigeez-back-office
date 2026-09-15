import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/utils";
import type { SaleWithDetails } from "@/lib/types";

/**
 * Sales joined with variant/product + computed revenue/cogs/profit, from the
 * v_sales view, strictly within the given date range. Sales with an unknown
 * date (imported historical "sold" pieces with no recorded date) are
 * intentionally excluded here — they can't be attributed to any specific
 * period, so counting them would skew range-based KPIs like sell-through.
 * Use getUnknownDateSales() to show them (e.g. on the Sales page).
 */
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

/** Sales with no recorded date — historical "sold" pieces imported without one. */
export async function getUnknownDateSales(): Promise<SaleWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_sales").select("*").is("sale_date", null).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load sales: ${error.message}`);
  return data ?? [];
}

/** All-time sales, used where a full history is needed (e.g. dead-stock last-sale lookups). */
export async function getAllSales(): Promise<SaleWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_sales")
    .select("*")
    .order("sale_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Failed to load sales: ${error.message}`);
  return data ?? [];
}
