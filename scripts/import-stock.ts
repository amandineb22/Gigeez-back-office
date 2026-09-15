/**
 * One-time import of the "Gigeez Master data stock" spreadsheet into
 * Supabase. Reads the pre-processed JSON snapshot in data/imports/ (not the
 * .xlsx itself) and upserts products, variants, stock units (physical
 * pieces currently in stock, with their bin/location), and historical
 * sales for pieces already marked "sold" in the sheet.
 *
 * Sold pieces have no recorded sale date or channel in the source sheet, so
 * they're imported with sale_date = null and channel = 'unknown' — shown as
 * "Unknown" in the Sales page rather than a guessed value.
 *
 * Usage: npm run import-stock  (reads .env.local automatically via dotenv)
 *        npm run import-stock -- --force   (re-run even if stock_units already has rows)
 *        npm run import-stock -- path/to/other-snapshot.json
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import type { Channel } from "../lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add both to .env.local before running `npm run import-stock` (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey);

interface ImportProduct {
  name: string;
  category: string;
  base_cost: number;
}

interface ImportVariant {
  variant_ref: string;
  sku: string;
  product_name: string;
  category: string;
  size: string;
  color: string;
  length: string | null;
  style: string | null;
  material: string | null;
  retail_price: number | null;
  base_cost: number | null;
  wholesale_price: number | null;
  price_estimated: boolean;
  stock_quantity: number;
}

interface ImportStockUnit {
  stock_unit_ref: string;
  variant_ref: string;
  bin_location: string;
  notes: string | null;
}

interface ImportSale {
  sale_ref: string;
  variant_ref: string;
  sale_date: string | null;
  channel: string;
  quantity: number;
  unit_price: number;
  payment_method: string;
  discount: number;
  is_refund: boolean;
  notes: string | null;
}

interface ImportFile {
  products: ImportProduct[];
  variants: ImportVariant[];
  stock_units: ImportStockUnit[];
  sales: ImportSale[];
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const dataFileArg = args.find((a) => !a.startsWith("--"));
const DATA_FILE = dataFileArg ?? join(__dirname, "../data/imports/2026-09-13-stock-import.json");

function insertInBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function main() {
  const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ImportFile;
  console.log(
    `Loaded ${raw.products.length} products, ${raw.variants.length} variants, ` +
      `${raw.stock_units.length} stock units, ${raw.sales.length} sold pieces from ${DATA_FILE}`
  );

  const { count: existingStockUnits } = await supabase
    .from("stock_units")
    .select("*", { count: "exact", head: true });
  if ((existingStockUnits ?? 0) > 0 && !force) {
    console.error(
      `stock_units already has ${existingStockUnits} row(s) — this import looks like it already ran.\n` +
        "Re-running would create duplicate physical units and duplicate historical sales. " +
        "Pass --force to import anyway."
    );
    process.exit(1);
  }

  console.log("Upserting products...");
  const { data: existingProducts, error: existingProductsError } = await supabase.from("products").select("id, name");
  if (existingProductsError) throw existingProductsError;
  const productIdByName = new Map((existingProducts ?? []).map((p) => [p.name, p.id]));
  const productsToInsert = raw.products.filter((p) => !productIdByName.has(p.name));
  if (productsToInsert.length) {
    const { data, error } = await supabase.from("products").insert(productsToInsert).select("id, name");
    if (error) throw error;
    for (const p of data ?? []) productIdByName.set(p.name, p.id);
  }

  console.log("Upserting variants (SKUs)...");
  const { data: existingVariants, error: existingVariantsError } = await supabase.from("variants").select("id, sku");
  if (existingVariantsError) throw existingVariantsError;
  const variantIdBySku = new Map((existingVariants ?? []).map((v) => [v.sku, v.id]));

  const variantsToInsert: Database["public"]["Tables"]["variants"]["Insert"][] = [];
  for (const v of raw.variants) {
    if (variantIdBySku.has(v.sku)) continue;
    const productId = productIdByName.get(v.product_name);
    if (!productId) throw new Error(`No product id resolved for "${v.product_name}" (sku ${v.sku})`);
    variantsToInsert.push({
      product_id: productId,
      sku: v.sku,
      size: v.size,
      color: v.color,
      length: v.length,
      style: v.style,
      material: v.material,
      base_cost: v.base_cost,
      retail_price: v.retail_price,
      wholesale_price: v.wholesale_price,
      stock_quantity: v.stock_quantity,
      reorder_point: 2,
    });
  }
  if (variantsToInsert.length) {
    const { data, error } = await supabase.from("variants").insert(variantsToInsert).select("id, sku");
    if (error) throw error;
    for (const v of data ?? []) variantIdBySku.set(v.sku, v.id);
  }

  const variantIdByRef = new Map<string, string>();
  for (const v of raw.variants) {
    const id = variantIdBySku.get(v.sku);
    if (!id) throw new Error(`Missing variant id for sku ${v.sku} after upsert`);
    variantIdByRef.set(v.variant_ref, id);
  }

  console.log(`Inserting ${raw.stock_units.length} stock units (physical pieces currently in stock)...`);
  let stockUnitsInserted = 0;
  for (const batch of insertInBatches(raw.stock_units, 500)) {
    const rows: Database["public"]["Tables"]["stock_units"]["Insert"][] = batch.map((su) => ({
      variant_id: variantIdByRef.get(su.variant_ref)!,
      bin_location: su.bin_location,
      status: "in_stock",
      notes: su.notes,
    }));
    const { error } = await supabase.from("stock_units").insert(rows);
    if (error) throw error;
    stockUnitsInserted += rows.length;
  }

  console.log(`Inserting ${raw.sales.length} historical sales for already-sold pieces...`);
  let salesInserted = 0;
  for (const batch of insertInBatches(raw.sales, 500)) {
    const rows: Database["public"]["Tables"]["sales"]["Insert"][] = batch.map((s) => ({
      sale_date: s.sale_date,
      variant_id: variantIdByRef.get(s.variant_ref)!,
      stock_unit_id: null,
      quantity: s.quantity,
      unit_price: s.unit_price,
      channel: s.channel as Channel,
      payment_method: s.payment_method,
      discount: s.discount,
      is_refund: s.is_refund,
      notes: s.notes,
    }));
    const { error } = await supabase.from("sales").insert(rows);
    if (error) throw error;
    salesInserted += rows.length;
  }

  console.log(
    `Done. ${productsToInsert.length} new products, ${variantsToInsert.length} new variants, ` +
      `${stockUnitsInserted} stock units, ${salesInserted} historical sales imported.`
  );
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
