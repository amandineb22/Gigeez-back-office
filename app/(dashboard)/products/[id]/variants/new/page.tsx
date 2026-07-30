import { notFound } from "next/navigation";
import { getProductWithVariants } from "@/lib/data/products";
import { createVariant } from "@/lib/actions/variants";
import { VariantForm } from "../VariantForm";

export default async function NewVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProductWithVariants(id);
  if (!data) notFound();

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-ink">Add SKU</h1>
      <p className="mb-6 text-sm text-ink/50">{data.product.name}</p>
      <VariantForm action={createVariant} productId={id} submitLabel="Add SKU" />
    </div>
  );
}
