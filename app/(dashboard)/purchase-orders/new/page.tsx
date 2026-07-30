import { getAllVariantsWithProduct } from "@/lib/data/variants";
import { getAllSuppliers } from "@/lib/data/suppliers";
import { createPurchaseOrder } from "@/lib/actions/purchaseOrders";
import { PurchaseOrderForm } from "../PurchaseOrderForm";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NewPurchaseOrderPage() {
  const [variants, suppliers] = await Promise.all([getAllVariantsWithProduct(), getAllSuppliers()]);

  if (variants.length === 0) {
    return (
      <EmptyState
        title="No SKUs yet"
        description="Add a product and at least one SKU before creating a purchase order."
        actionLabel="Add a product"
        actionHref="/products/new"
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add purchase order</h1>
      <PurchaseOrderForm action={createPurchaseOrder} variants={variants} suppliers={suppliers} submitLabel="Add purchase order" />
    </div>
  );
}
