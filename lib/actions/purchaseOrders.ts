"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

function parsePurchaseOrderForm(formData: FormData) {
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const expectedDate = String(formData.get("expected_date") ?? "").trim();
  return {
    supplier_id: supplierId || null,
    variant_id: String(formData.get("variant_id") ?? ""),
    quantity_ordered: Number(formData.get("quantity_ordered")),
    unit_cost: Number(formData.get("unit_cost")),
    expected_date: expectedDate || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validatePurchaseOrderForm(fields: ReturnType<typeof parsePurchaseOrderForm>): string | null {
  if (!fields.variant_id) return "Choose a SKU.";
  if (!Number.isInteger(fields.quantity_ordered) || fields.quantity_ordered <= 0) return "Quantity must be a positive whole number.";
  if (!Number.isFinite(fields.unit_cost) || fields.unit_cost < 0) return "Unit cost must be zero or more.";
  return null;
}

function revalidatePOPages() {
  revalidatePath("/purchase-orders");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function createPurchaseOrder(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parsePurchaseOrderForm(formData);
  const validationError = validatePurchaseOrderForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").insert(fields);
  if (error) return { error: error.message };

  revalidatePOPages();
  redirect("/purchase-orders");
}

export async function updatePurchaseOrder(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parsePurchaseOrderForm(formData);
  const validationError = validatePurchaseOrderForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidatePOPages();
  redirect("/purchase-orders");
}

export async function deletePurchaseOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePOPages();
}

/** Marks a PO received, stamps received_at, and adds the ordered quantity to the SKU's stock. */
export async function receivePurchaseOrder(id: string) {
  const supabase = await createClient();
  const { data: po, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("variant_id, quantity_ordered, received")
    .eq("id", id)
    .single();
  if (fetchError || !po) throw new Error("Purchase order not found.");
  if (po.received) return; // already received, avoid double-crediting stock

  const { error } = await supabase
    .from("purchase_orders")
    .update({ received: true, received_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.rpc("adjust_variant_stock", { p_variant_id: po.variant_id, p_delta: po.quantity_ordered });

  revalidatePOPages();
}
