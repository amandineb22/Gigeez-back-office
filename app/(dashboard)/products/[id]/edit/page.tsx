import { notFound } from "next/navigation";
import { getProductWithVariants } from "@/lib/data/products";
import { updateProduct } from "@/lib/actions/products";
import { ProductForm } from "../../ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProductWithVariants(id);
  if (!data) notFound();

  const action = updateProduct.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit product</h1>
      <ProductForm action={action} defaultValues={data.product} submitLabel="Save changes" />
    </div>
  );
}
