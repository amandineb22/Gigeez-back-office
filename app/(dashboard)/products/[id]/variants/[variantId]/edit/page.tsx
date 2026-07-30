import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateVariant } from "@/lib/actions/variants";
import { VariantForm } from "../../VariantForm";

export default async function EditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const supabase = await createClient();
  const { data: variant } = await supabase.from("variants").select("*").eq("id", variantId).single();
  if (!variant) notFound();

  const action = updateVariant.bind(null, variantId, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit SKU</h1>
      <VariantForm action={action} productId={id} defaultValues={variant} submitLabel="Save changes" />
    </div>
  );
}
