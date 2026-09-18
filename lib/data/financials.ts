import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BpTarget, FinancialMonth, HistoricYear } from "@/lib/types";

/** Every month of spreadsheet actuals, oldest first. */
export async function getFinancialMonths(): Promise<FinancialMonth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_months")
    .select("*")
    .order("month", { ascending: true });

  if (error) throw new Error(`Failed to load financial months: ${error.message}`);
  return data ?? [];
}

/** The months of one calendar year, oldest first. */
export async function getFinancialMonthsForYear(year: number): Promise<FinancialMonth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_months")
    .select("*")
    .gte("month", `${year}-01-01`)
    .lte("month", `${year}-12-31`)
    .order("month", { ascending: true });

  if (error) throw new Error(`Failed to load financial months: ${error.message}`);
  return data ?? [];
}

/** Business-plan targets, earliest year first. */
export async function getBpTargets(): Promise<BpTarget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bp_targets")
    .select("*")
    .order("year", { ascending: true });

  if (error) throw new Error(`Failed to load business plan targets: ${error.message}`);
  return data ?? [];
}

/** The HIST tab's fiscal years, earliest first. */
export async function getHistoricYears(): Promise<HistoricYear[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historic_years")
    .select("*")
    .order("fiscal_year", { ascending: true });

  if (error) throw new Error(`Failed to load historic years: ${error.message}`);
  return data ?? [];
}
