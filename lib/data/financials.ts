import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BpTarget, FinancialMonth, HistoricYear } from "@/lib/types";

/** Postgres "relation does not exist". */
const UNDEFINED_TABLE = "42P01";

/**
 * A deploy can land before its migration has been run — the code goes out when
 * the branch is deployed, the SQL is run by hand in the Supabase editor. When
 * that happens these tables are simply not there yet.
 *
 * Rather than throw and take the whole page down with a server-side exception,
 * treat a missing table as "no data yet": the sections that need it don't
 * render, everything else on the page still works, and the server log says
 * plainly what is missing. Any other error is a real one and still throws.
 */
function emptyIfTableMissing<T>(
  error: { code?: string; message: string } | null,
  table: string,
  data: T[] | null
): T[] {
  if (!error) return data ?? [];
  if (error.code === UNDEFINED_TABLE) {
    console.warn(
      `[financials] Table "${table}" does not exist yet — run supabase/add-financials-tables.sql. ` +
        "Showing this section as empty for now."
    );
    return [];
  }
  throw new Error(`Failed to load ${table}: ${error.message}`);
}

/** Every month of spreadsheet actuals, oldest first. */
export async function getFinancialMonths(): Promise<FinancialMonth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_months")
    .select("*")
    .order("month", { ascending: true });

  return emptyIfTableMissing(error, "financial_months", data);
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

  return emptyIfTableMissing(error, "financial_months", data);
}

/** Business-plan targets, earliest year first. */
export async function getBpTargets(): Promise<BpTarget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bp_targets")
    .select("*")
    .order("year", { ascending: true });

  return emptyIfTableMissing(error, "bp_targets", data);
}

/** The HIST tab's fiscal years, earliest first. */
export async function getHistoricYears(): Promise<HistoricYear[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historic_years")
    .select("*")
    .order("fiscal_year", { ascending: true });

  return emptyIfTableMissing(error, "historic_years", data);
}
