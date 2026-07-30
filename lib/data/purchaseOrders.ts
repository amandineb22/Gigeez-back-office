import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/lib/utils";
import type { PurchaseOrderWithDetails } from "@/lib/types";

export async function getReceivedPOsInRange(range: DateRange) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("variant_id, quantity_ordered, unit_cost, received_at")
    .eq("received", true)
    .gte("received_at", range.from)
    .lte("received_at", `${range.to}T23:59:59`);

  if (error) throw new Error(`Failed to load received purchase orders: ${error.message}`);
  return (data ?? []) as { variant_id: string; quantity_ordered: number; unit_cost: number; received_at: string }[];
}

export async function getAllPurchaseOrders(): Promise<PurchaseOrderWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "*, supplier:suppliers(id, name), variant:variants(id, sku, size, color, product:products(id, name))"
    )
    .order("expected_date", { ascending: true });

  if (error) throw new Error(`Failed to load purchase orders: ${error.message}`);
  return (data ?? []) as unknown as PurchaseOrderWithDetails[];
}
