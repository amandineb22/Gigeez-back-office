/**
 * Seeds a fresh Supabase project with realistic sample data so the dashboard
 * isn't empty on first run. Uses the service_role key (bypasses RLS) since
 * this runs outside of any authenticated user session.
 *
 * Usage: npm run seed  (reads .env.local automatically via dotenv)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add both to .env.local before running `npm run seed` (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey);

const CHANNELS = ["online", "in-store", "wholesale", "pop-up"] as const;
const PAYMENT_METHODS = ["card", "cash", "bank transfer", "paypal"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Seeding products...");
  const { data: products, error: productsError } = await supabase
    .from("products")
    .insert([
      { name: "Linen Wrap Dress", category: "Dresses", base_cost: 28, notes: "Runs true to size." },
      { name: "Organic Cotton Tee", category: "Tops", base_cost: 8, notes: null },
      { name: "Tailored Wool Trousers", category: "Bottoms", base_cost: 35, notes: null },
      { name: "Quilted Field Jacket", category: "Outerwear", base_cost: 52, notes: "Seasonal, restock before fall." },
      { name: "Woven Leather Belt", category: "Accessories", base_cost: 12, notes: null },
    ])
    .select();
  if (productsError) throw productsError;

  console.log("Seeding variants...");
  const variantConfig: Record<string, { sizes: string[]; colors: string[]; priceMultiplier: number }> = {
    "Linen Wrap Dress": { sizes: ["S", "M", "L"], colors: ["Terracotta", "Sage"], priceMultiplier: 3.4 },
    "Organic Cotton Tee": { sizes: ["S", "M", "L", "XL"], colors: ["White", "Black"], priceMultiplier: 3.75 },
    "Tailored Wool Trousers": { sizes: ["28", "30", "32"], colors: ["Charcoal"], priceMultiplier: 3.1 },
    "Quilted Field Jacket": { sizes: ["S", "M", "L"], colors: ["Olive"], priceMultiplier: 2.9 },
    "Woven Leather Belt": { sizes: ["One Size"], colors: ["Brown", "Black"], priceMultiplier: 4.2 },
  };

  const variantsToInsert: Database["public"]["Tables"]["variants"]["Insert"][] = [];
  for (const p of products) {
    const config = variantConfig[p.name];
    const initials = p.name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();
    for (const size of config.sizes) {
      for (const color of config.colors) {
        variantsToInsert.push({
          product_id: p.id,
          sku: `${initials}-${size}-${color.slice(0, 3).toUpperCase()}`,
          size,
          color,
          stock_quantity: randomInt(4, 35),
          reorder_point: 8,
        });
      }
    }
  }
  const { data: variants, error: variantsError } = await supabase.from("variants").insert(variantsToInsert).select();
  if (variantsError) throw variantsError;

  const sellingPriceByProductId = new Map(
    products.map((p) => [p.id, Math.round(p.base_cost * variantConfig[p.name].priceMultiplier * 100) / 100])
  );

  console.log("Seeding suppliers...");
  const { data: suppliers, error: suppliersError } = await supabase
    .from("suppliers")
    .insert([
      { name: "Northfield Textiles Co.", contact: "orders@northfieldtextiles.com", lead_time_days: 21, notes: "Linen & cotton base fabrics." },
      { name: "Cascade Garment Works", contact: "hello@cascadegarment.com", lead_time_days: 14, notes: "Cut & sew partner." },
      { name: "Amistad Leather Goods", contact: "sales@amistadleather.com", lead_time_days: 30, notes: null },
    ])
    .select();
  if (suppliersError) throw suppliersError;

  console.log("Seeding sales (last ~120 days)...");
  const salesToInsert: Database["public"]["Tables"]["sales"]["Insert"][] = [];
  for (let i = 0; i < 260; i++) {
    const variant = randomItem(variants);
    const unitPrice = sellingPriceByProductId.get(variant.product_id) ?? 40;
    const isRefund = Math.random() < 0.05;
    salesToInsert.push({
      sale_date: isoDate(daysAgo(randomInt(0, 120))),
      variant_id: variant.id,
      quantity: randomInt(1, 3),
      unit_price: unitPrice,
      channel: randomItem(CHANNELS),
      payment_method: randomItem(PAYMENT_METHODS),
      discount: Math.random() < 0.15 ? Math.round(unitPrice * 0.1 * 100) / 100 : 0,
      is_refund: isRefund,
    });
  }
  const { error: salesError } = await supabase.from("sales").insert(salesToInsert);
  if (salesError) throw salesError;

  console.log("Adjusting stock for seeded sales...");
  for (const sale of salesToInsert) {
    await supabase.rpc("adjust_variant_stock", {
      p_variant_id: sale.variant_id,
      p_delta: sale.is_refund ? sale.quantity : -sale.quantity,
    });
  }

  console.log("Seeding expenses (last 4 months)...");
  const expensesToInsert: Database["public"]["Tables"]["expenses"]["Insert"][] = [];
  for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
    const monthDate = daysAgo(monthOffset * 30);
    expensesToInsert.push(
      { expense_date: isoDate(monthDate), category: "rent", amount: 1800, cost_type: "fixed", vendor: "Studio Lease LLC" },
      { expense_date: isoDate(monthDate), category: "salaries", amount: 4200, cost_type: "fixed", vendor: "Payroll" },
      { expense_date: isoDate(monthDate), category: "software", amount: 145, cost_type: "fixed", vendor: "Various SaaS" },
      { expense_date: isoDate(monthDate), category: "utilities", amount: 210, cost_type: "fixed", vendor: "City Utilities" },
      { expense_date: isoDate(monthDate), category: "marketing", amount: randomInt(300, 900), cost_type: "variable", vendor: "Meta Ads" },
      { expense_date: isoDate(monthDate), category: "shipping", amount: randomInt(200, 500), cost_type: "variable", vendor: "Regional Post" },
      { expense_date: isoDate(monthDate), category: "packaging", amount: randomInt(80, 220), cost_type: "variable", vendor: "EcoPack Supply" },
      { expense_date: isoDate(monthDate), category: "materials", amount: randomInt(600, 1500), cost_type: "variable", vendor: "Northfield Textiles Co." },
      { expense_date: isoDate(monthDate), category: "manufacturing", amount: randomInt(800, 2000), cost_type: "variable", vendor: "Cascade Garment Works" }
    );
  }
  const { error: expensesError } = await supabase.from("expenses").insert(expensesToInsert);
  if (expensesError) throw expensesError;

  console.log("Seeding purchase orders...");
  const poVariants = [variants[0], variants[2], variants[4], variants[6]].filter(Boolean);
  const purchaseOrdersToInsert: Database["public"]["Tables"]["purchase_orders"]["Insert"][] = poVariants.map(
    (v, i) => ({
      supplier_id: suppliers[i % suppliers.length].id,
      variant_id: v.id,
      quantity_ordered: randomInt(20, 60),
      unit_cost: 10,
      expected_date: isoDate(daysAgo(-randomInt(5, 30))),
      received: i % 2 === 0,
      received_at: i % 2 === 0 ? new Date().toISOString() : null,
    })
  );
  const { error: poError } = await supabase.from("purchase_orders").insert(purchaseOrdersToInsert);
  if (poError) throw poError;

  for (const po of purchaseOrdersToInsert) {
    if (po.received) {
      await supabase.rpc("adjust_variant_stock", { p_variant_id: po.variant_id, p_delta: po.quantity_ordered });
    }
  }

  console.log("Seeding goals...");
  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = isoDate(new Date(now.getFullYear(), quarterStartMonth, 1));
  const yearStart = isoDate(new Date(now.getFullYear(), 0, 1));

  const { error: goalsError } = await supabase.from("goals").insert([
    { metric_type: "revenue", target_amount: 9000, period_type: "monthly", period_start: monthStart, notes: "Monthly revenue target" },
    { metric_type: "profit", target_amount: 15000, period_type: "quarterly", period_start: quarterStart, notes: "Quarterly profit target" },
    { metric_type: "revenue", target_amount: 100000, period_type: "yearly", period_start: yearStart, notes: "Annual revenue target" },
  ]);
  if (goalsError) throw goalsError;

  console.log("Seeding a journal entry...");
  const { error: noteError } = await supabase.from("monthly_notes").upsert(
    {
      note_month: monthStart,
      content: "Strong pop-up weekend boosted in-store revenue. Linen Wrap Dress restock arriving next month.",
    },
    { onConflict: "note_month" }
  );
  if (noteError) throw noteError;

  console.log("Done. Seeded products, variants, suppliers, sales, expenses, purchase orders, goals, and a journal entry.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
