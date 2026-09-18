/**
 * Hand-written Supabase Database type (mirrors supabase/schema.sql).
 *
 * If you'd rather generate this automatically once the Supabase CLI is set
 * up, run:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 * and this file can be replaced wholesale.
 */

import type { Channel, CostType, ExpenseCategory, GoalMetric, GoalPeriod } from "@/lib/types";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          base_cost: number;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          category: string;
          base_cost?: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: Relationship[];
      };
      variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          length: string | null;
          style: string | null;
          material: string | null;
          base_cost: number | null;
          retail_price: number | null;
          wholesale_price: number | null;
          stock_quantity: number;
          reorder_point: number;
        } & Timestamps;
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          length?: string | null;
          style?: string | null;
          material?: string | null;
          base_cost?: number | null;
          retail_price?: number | null;
          wholesale_price?: number | null;
          stock_quantity?: number;
          reorder_point?: number;
        };
        Update: Partial<Database["public"]["Tables"]["variants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_units: {
        Row: {
          id: string;
          variant_id: string;
          bin_location: string;
          status: "in_stock" | "sold";
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          variant_id: string;
          bin_location?: string;
          status?: "in_stock" | "sold";
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["stock_units"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "stock_units_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          lead_time_days: number | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          name: string;
          contact?: string | null;
          lead_time_days?: number | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: Relationship[];
      };
      sales: {
        Row: {
          id: string;
          sale_date: string | null;
          variant_id: string;
          stock_unit_id: string | null;
          quantity: number;
          unit_price: number;
          channel: Channel;
          payment_method: string;
          discount: number;
          is_refund: boolean;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          sale_date?: string | null;
          variant_id: string;
          stock_unit_id?: string | null;
          quantity: number;
          unit_price: number;
          channel: Channel;
          payment_method?: string;
          discount?: number;
          is_refund?: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["sales"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sales_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_stock_unit_id_fkey";
            columns: ["stock_unit_id"];
            isOneToOne: false;
            referencedRelation: "stock_units";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          expense_date: string;
          category: ExpenseCategory;
          amount: number;
          cost_type: CostType;
          vendor: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          expense_date: string;
          category: ExpenseCategory;
          amount: number;
          cost_type: CostType;
          vendor?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: Relationship[];
      };
      purchase_orders: {
        Row: {
          id: string;
          supplier_id: string | null;
          variant_id: string;
          quantity_ordered: number;
          unit_cost: number;
          expected_date: string | null;
          received: boolean;
          received_at: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          supplier_id?: string | null;
          variant_id: string;
          quantity_ordered: number;
          unit_cost: number;
          expected_date?: string | null;
          received?: boolean;
          received_at?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          metric_type: GoalMetric;
          target_amount: number;
          period_type: GoalPeriod;
          period_start: string;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          metric_type: GoalMetric;
          target_amount: number;
          period_type: GoalPeriod;
          period_start: string;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: Relationship[];
      };
      monthly_notes: {
        Row: {
          id: string;
          note_month: string;
          content: string;
        } & Timestamps;
        Insert: {
          id?: string;
          note_month: string;
          content?: string;
        };
        Update: Partial<Database["public"]["Tables"]["monthly_notes"]["Insert"]>;
        Relationships: Relationship[];
      };
      financial_months: {
        Row: {
          id: string;
          month: string;
          units: number;
          revenue: number;
          cost_production: number;
          cost_commercial: number;
          cost_marketing: number;
          cost_admin: number;
        } & Timestamps;
        Insert: {
          id?: string;
          month: string;
          units?: number;
          revenue?: number;
          cost_production?: number;
          cost_commercial?: number;
          cost_marketing?: number;
          cost_admin?: number;
        };
        Update: Partial<Database["public"]["Tables"]["financial_months"]["Insert"]>;
        Relationships: Relationship[];
      };
      bp_targets: {
        Row: {
          id: string;
          year: number;
          units: number;
          revenue: number;
          expenses: number;
          ebitda: number;
        } & Timestamps;
        Insert: {
          id?: string;
          year: number;
          units?: number;
          revenue?: number;
          expenses?: number;
          ebitda?: number;
        };
        Update: Partial<Database["public"]["Tables"]["bp_targets"]["Insert"]>;
        Relationships: Relationship[];
      };
    };
    Views: {
      v_sales: {
        Row: {
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
        };
        Relationships: Relationship[];
      };
      v_inventory: {
        Row: {
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
        };
        Relationships: Relationship[];
      };
      v_stock_units: {
        Row: {
          stock_unit_id: string;
          bin_location: string;
          status: "in_stock" | "sold";
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
        };
        Relationships: Relationship[];
      };
    };
    Functions: {
      adjust_variant_stock: {
        Args: { p_variant_id: string; p_delta: number };
        Returns: void;
      };
    };
  };
}
