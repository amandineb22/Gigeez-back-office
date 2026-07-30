import { createProduct } from "@/lib/actions/products";
import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add product</h1>
      <ProductForm action={createProduct} submitLabel="Add product" />
    </div>
  );
}
