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

interface ImportFile {
  source_file: string;
  base_currency: string;
  monthly: ImportMonth[];
  bp_targets: ImportTarget[];
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
    `Loaded ${raw.monthly.length} months and ${raw.bp_targets.length} target years from ${DATA_FILE} ` +
      `(source: ${raw.source_file})`
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

  console.log("Done. Sales, expenses and stock were not touched.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
