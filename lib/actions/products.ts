"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error: string | null;
}

function parseProductForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    base_cost: Number(formData.get("base_cost")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateProductForm(fields: ReturnType<typeof parseProductForm>): string | null {
  if (!fields.name) return "Give the product a name.";
  if (!fields.category) return "Give the product a category.";
  if (!Number.isFinite(fields.base_cost) || fields.base_cost < 0) return "Base cost must be zero or more.";
  return null;
}

export async function createProduct(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseProductForm(formData);
  const validationError = validateProductForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").insert(fields).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect(`/products/${data.id}`);
}

export async function updateProduct(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseProductForm(formData);
  const validationError = validateProductForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(`/products/${id}`);
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Can't delete: this product has recorded sales or purchase orders. Remove those first.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/products");
  redirect("/products");
}
