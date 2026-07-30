import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllVariantsWithProduct } from "@/lib/data/variants";
import { getAllSuppliers } from "@/lib/data/suppliers";
import { updatePurchaseOrder } from "@/lib/actions/purchaseOrders";
import { PurchaseOrderForm } from "../../PurchaseOrderForm";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: po }, variants, suppliers] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    getAllVariantsWithProduct(),
    getAllSuppliers(),
  ]);

  if (!po) notFound();

  const action = updatePurchaseOrder.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit purchase order</h1>
      <PurchaseOrderForm action={action} variants={variants} suppliers={suppliers} defaultValues={po} submitLabel="Save changes" />
    </div>
  );
}
