import { getAllVariantsWithProduct } from "@/lib/data/variants";
import { createSale } from "@/lib/actions/sales";
import { SaleForm } from "../SaleForm";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NewSalePage() {
  const variants = await getAllVariantsWithProduct();

  if (variants.length === 0) {
    return (
      <EmptyState
        title="No SKUs yet"
        description="Add a product and at least one size/color variant before logging a sale."
        actionLabel="Add a product"
        actionHref="/products/new"
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add sale</h1>
      <SaleForm action={createSale} variants={variants} submitLabel="Add sale" />
    </div>
  );
}
