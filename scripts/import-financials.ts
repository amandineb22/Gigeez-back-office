/**
 * Imports the Gigeez profit-and-loss spreadsheet into Supabase: monthly
 * actuals into `financial_months`, yearly business-plan targets into
 * `bp_targets`.
 *
 * Reads the pre-processed JSON snapshot in data/imports/ rather than the
 * .xlsx itself, the same way `import-stock` does.
 *
 * Both tables are keyed on the period (month / year) and this script upserts
 * on that key, so re-running after the spreadsheet is updated refreshes the
 * figures in place instead of duplicating them. Nothing in `sales`,
 * `expenses` or `stock_units` is read or written: the spreadsheet is kept as
 * a separate record of the business, never merged into the piece-level data.
 *
 * Usage: npm run import-financials  (reads .env.local automatically via dotenv)
 *        npm run import-financials -- path/to/other-snapshot.json
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add both to .env.local before running `npm run import-financials` (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey);

interface ImportMonth {
  month: string;
  units: number;
  revenue: number;
  cost_production: number;
  cost_commercial: number;
  cost_marketing: number;
  cost_admin: number;
}

interface ImportTarget {
  year: number;
  units: number;
  revenue: number;
  expenses: number;
  ebitda: number;
}

interface ImportHistoricYear {
  fiscal_year: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  ebitda: number;
  inventories: number;
  net_cash: number;
  net_equity: number;
}

interface ImportExpense {
  source_ref: string;
  expense_date: string;
  category: string;
  amount: number;
  cost_type: string;
  vendor: string | null;
  notes: string;
}

interface ImportFile {
  source_file: string;
  base_currency: string;
  monthly: ImportMonth[];
  bp_targets: ImportTarget[];
  historic_years?: ImportHistoricYear[];
  expenses?: ImportExpense[];
  expenses_skipped?: { month: string; label: string; amount: number }[];
}

const fileArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const DATA_FILE = fileArg ?? join(process.cwd(), "data/imports/2026-financials.json");

async function main() {
  const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ImportFile;

  if (raw.base_currency !== "QAR") {
    console.error(
      `Snapshot is denominated in ${raw.base_currency}, but the database stores QAR. ` +
        "Convert the figures before importing."
    );
    process.exit(1);
  }

  console.log(
    `Loaded ${raw.monthly.length} months, ${raw.bp_targets.length} target years and ` +
      `${raw.historic_years?.length ?? 0} historic years and ${raw.expenses?.length ?? 0} expense lines ` +
      `from ${DATA_FILE} (source: ${raw.source_file})`
  );

  const months = raw.monthly.map((m) => ({
    month: m.month,
    units: m.units,
    revenue: m.revenue,
    cost_production: m.cost_production,
    cost_commercial: m.cost_commercial,
    cost_marketing: m.cost_marketing,
    cost_admin: m.cost_admin,
  }));

  const { error: monthsError } = await supabase
    .from("financial_months")
    .upsert(months, { onConflict: "month" });
  if (monthsError) throw monthsError;
  console.log(`${months.length} monthly rows upserted into financial_months.`);

  const targets = raw.bp_targets.map((t) => ({
    year: t.year,
    units: t.units,
    revenue: t.revenue,
    expenses: t.expenses,
    ebitda: t.ebitda,
  }));

  const { error: targetsError } = await supabase
    .from("bp_targets")
    .upsert(targets, { onConflict: "year" });
  if (targetsError) throw targetsError;
  console.log(`${targets.length} target years upserted into bp_targets.`);

  const historic = raw.historic_years ?? [];
  if (historic.length) {
    const { error: historicError } = await supabase
      .from("historic_years")
      .upsert(historic, { onConflict: "fiscal_year" });
    if (historicError) throw historicError;
    console.log(`${historic.length} historic years upserted into historic_years.`);
  }

  // Individual expense lines from the sheet's four cost bands. Keyed by
  // source_ref so a re-import updates the same rows rather than adding a
  // second copy; anything entered by hand has a null source_ref and is never
  // touched here.
  const expenses = raw.expenses ?? [];
  if (expenses.length) {
    const rows: Database["public"]["Tables"]["expenses"]["Insert"][] = expenses.map((e) => ({
      source_ref: e.source_ref,
      expense_date: e.expense_date,
      category: e.category as Database["public"]["Tables"]["expenses"]["Insert"]["category"],
      amount: e.amount,
      cost_type: e.cost_type as Database["public"]["Tables"]["expenses"]["Insert"]["cost_type"],
      vendor: e.vendor,
      notes: e.notes,
    }));
    const { error: expensesError } = await supabase
      .from("expenses")
      .upsert(rows, { onConflict: "source_ref" });
    if (expensesError) throw expensesError;
    console.log(`${rows.length} expense lines upserted into expenses (hand-entered rows untouched).`);
  }

  for (const s of raw.expenses_skipped ?? []) {
    console.log(
      `Skipped ${s.month} "${s.label}" (${s.amount}): the expenses table only accepts ` +
        "amounts of zero or more, and this is money in rather than money out."
    );
  }

  console.log("Done. Sales and stock were not touched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
