/**
 * TypeScript mirror of supabase/schema.sql. Keep in sync manually — if you
 * add/rename a column there, update the matching type here.
 */

export type Channel = "online" | "in-store" | "wholesale" | "pop-up" | "unknown";

export type StockUnitStatus = "in_stock" | "sold";

export type ExpenseCategory =
  | "materials"
  | "manufacturing"
  | "shipping"
  | "packaging"
  | "marketing"
  | "rent"
  | "utilities"
  | "salaries"
  | "software"
  | "travel"
  | "other";

export type CostType = "fixed" | "variable";

export type GoalMetric = "revenue" | "profit" | "orders" | "aov";

export type GoalPeriod = "monthly" | "quarterly" | "yearly";

export interface Product {
  id: string;
  name: string;
  category: string;
  base_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  color: string;
  /** Raw stock-sheet code (X/D/N/U…) — displayed as-is, no confirmed legend. */
  length: string | null;
  /** Raw stock-sheet code (SF/AY/EC/BF/GC/UU…) — displayed as-is. */
  style: string | null;
  /** Raw stock-sheet code (VI/CH/CS/SI…) — displayed as-is. */
  material: string | null;
  /** Per-variant COGS override; null falls back to the product's base_cost. */
  base_cost: number | null;
  retail_price: number | null;
  wholesale_price: number | null;
  stock_quantity: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
}

export interface StockUnit {
  id: string;
  variant_id: string;
  bin_location: string;
  status: StockUnitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of the v_stock_units view — one physical piece, joined with variant/product. */
export interface StockUnitWithDetails {
  stock_unit_id: string;
  bin_location: string;
  status: StockUnitStatus;
  notes: string | null;
  created_at: string;
  variant_id: string;
  sku: string;
  size: string;
  color: string;
  length: string | null;
  style: string | null;
  material: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  base_cost: number;
  product_id: string;
  product_name: string;
  category: string;
}

export interface VariantWithProduct extends Variant {
  product: Pick<Product, "id" | "name" | "category" | "base_cost">;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  lead_time_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  /** Null means the sale date wasn't recorded (shown as "Unknown"). */
  sale_date: string | null;
  variant_id: string;
  /** Optional link to the exact physical piece sold (stock_units). */
  stock_unit_id: string | null;
  quantity: number;
  unit_price: number;
  channel: Channel;
  payment_method: string;
  discount: number;
  is_refund: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of the v_sales view — sales joined with variant/product + computed revenue/cogs/profit. */
export interface SaleWithDetails {
  id: string;
  sale_date: string | null;
  variant_id: string;
  stock_unit_id: string | null;
  sku: string;
  size: string;
  color: string;
  length: string | null;
  style: string | null;
  material: string | null;
  product_id: string;
  product_name: string;
  category: string;
  /** Bin the physical unit was sold from, if known (from stock_units). */
  sold_from: string | null;
  quantity: number;
  unit_price: number;
  channel: Channel;
  payment_method: string;
  discount: number;
  is_refund: boolean;
  notes: string | null;
  base_cost: number;
  revenue: number;
  cogs: number;
  profit: number;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  cost_type: CostType;
  vendor: string | null;
  notes: string | null;
  /** Set on rows imported from the P&L sheet; null for hand-entered ones. */
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  variant_id: string;
  quantity_ordered: number;
  unit_cost: number;
  expected_date: string | null;
  received: boolean;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: Pick<Supplier, "id" | "name"> | null;
  variant: Pick<Variant, "id" | "sku" | "size" | "color"> & {
    product: Pick<Product, "id" | "name">;
  };
}

export interface Goal {
  id: string;
  metric_type: GoalMetric;
  target_amount: number;
  period_type: GoalPeriod;
  period_start: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyNote {
  id: string;
  note_month: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Row shape of the v_inventory view — variant joined with product + computed value/low-stock flag. */
export interface InventoryRow {
  variant_id: string;
  sku: string;
  size: string;
  color: string;
  length: string | null;
  style: string | null;
  material: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  stock_quantity: number;
  reorder_point: number;
  product_id: string;
  product_name: string;
  category: string;
  base_cost: number;
  inventory_value: number;
  low_stock: boolean;
}

/** All channels the database accepts, including "unknown" (only ever set by historical imports). */
export const CHANNELS: Channel[] = ["online", "in-store", "wholesale", "pop-up", "unknown"];
/** Channels offered on the "Add sale" form — "unknown" is import-only and not a real choice going forward. */
export const SALE_FORM_CHANNELS: Channel[] = ["online", "in-store", "wholesale", "pop-up"];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "materials",
  "manufacturing",
  "shipping",
  "packaging",
  "marketing",
  "rent",
  "utilities",
  "salaries",
  "software",
  "travel",
  "other",
];

export const PAYMENT_METHODS = ["card", "cash", "bank transfer", "paypal", "other"];

/**
 * A month of actuals from the Gigeez P&L spreadsheet. Amounts are in QAR, and
 * the four cost columns are the spreadsheet's own bands. Kept apart from
 * `Sale` / `Expense`, which record individual pieces and individual expense
 * lines: the two describe the same business but are never added together.
 */
export interface FinancialMonth {
  id: string;
  month: string; // ISO date, always the 1st
  units: number;
  revenue: number;
  cost_production: number;
  cost_commercial: number;
  cost_marketing: number;
  cost_admin: number;
  created_at: string;
  updated_at: string;
}

/** A year of business-plan targets from the BP (Target) sheet, stored in QAR. */
export interface BpTarget {
  id: string;
  year: number;
  units: number;
  revenue: number;
  expenses: number;
  ebitda: number;
  created_at: string;
  updated_at: string;
}

/** The spreadsheet's cost bands, in the order they appear on the dashboard. */
export const FINANCIAL_COST_BANDS = [
  { key: "cost_production", label: "Production" },
  { key: "cost_commercial", label: "Commercial" },
  { key: "cost_marketing", label: "Marketing" },
  { key: "cost_admin", label: "Admin" },
] as const;

export type FinancialCostBand = (typeof FINANCIAL_COST_BANDS)[number]["key"];

/**
 * A fiscal year from the HIST tab — years ending 31 March, predating the
 * monthly P&L sheet. No unit counts: the tab never recorded them.
 */
export interface HistoricYear {
  id: string;
  fiscal_year: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  ebitda: number;
  inventories: number;
  net_cash: number;
  net_equity: number;
  created_at: string;
  updated_at: string;
}
