"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

function parseVariantForm(formData: FormData) {
  return {
    product_id: String(formData.get("product_id") ?? ""),
    sku: String(formData.get("sku") ?? "").trim(),
    size: String(formData.get("size") ?? "").trim(),
    color: String(formData.get("color") ?? "").trim(),
    stock_quantity: Number(formData.get("stock_quantity")),
    reorder_point: Number(formData.get("reorder_point")),
  };
}

function validateVariantForm(fields: ReturnType<typeof parseVariantForm>): string | null {
  if (!fields.product_id) return "Missing product.";
  if (!fields.sku) return "Give this variant a SKU code.";
  if (!fields.size) return "Give this variant a size.";
  if (!fields.color) return "Give this variant a color.";
  if (!Number.isInteger(fields.stock_quantity) || fields.stock_quantity < 0) return "Stock quantity must be zero or more.";
  if (!Number.isInteger(fields.reorder_point) || fields.reorder_point < 0) return "Reorder point must be zero or more.";
  return null;
}

export async function createVariant(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseVariantForm(formData);
  const validationError = validateVariantForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("variants").insert(fields);
  if (error) {
    if (error.code === "23505") return { error: "That SKU code, or size/color combination, already exists." };
    return { error: error.message };
  }

  revalidatePath(`/products/${fields.product_id}`);
  revalidatePath("/inventory");
  redirect(`/products/${fields.product_id}`);
}

export async function updateVariant(
  id: string,
  productId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const fields = parseVariantForm(formData);
  const validationError = validateVariantForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("variants").update(fields).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "That SKU code, or size/color combination, already exists." };
    return { error: error.message };
  }

  revalidatePath(`/products/${productId}`);
  revalidatePath("/inventory");
  redirect(`/products/${productId}`);
}

export async function deleteVariant(id: string, productId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("variants").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Can't delete: this SKU has recorded sales or purchase orders.");
    }
    throw new Error(error.message);
  }
  revalidatePath(`/products/${productId}`);
  revalidatePath("/inventory");
}
