/**
 * TypeScript mirror of supabase/schema.sql. Keep in sync manually — if you
 * add/rename a column there, update the matching type here.
 */

export type Channel = "online" | "in-store" | "wholesale" | "pop-up";

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
  stock_quantity: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
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
  sale_date: string;
  variant_id: string;
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
  sale_date: string;
  variant_id: string;
  sku: string;
  size: string;
  color: string;
  product_id: string;
  product_name: string;
  category: string;
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
  stock_quantity: number;
  reorder_point: number;
  product_id: string;
  product_name: string;
  category: string;
  base_cost: number;
  inventory_value: number;
  low_stock: boolean;
}

export const CHANNELS: Channel[] = ["online", "in-store", "wholesale", "pop-up"];

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
  "other",
];

export const PAYMENT_METHODS = ["card", "cash", "bank transfer", "paypal", "other"];
