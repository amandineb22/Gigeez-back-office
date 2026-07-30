import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllVariantsWithProduct } from "@/lib/data/variants";
import { updateSale } from "@/lib/actions/sales";
import { SaleForm } from "../../SaleForm";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sale }, variants] = await Promise.all([
    supabase.from("sales").select("*").eq("id", id).single(),
    getAllVariantsWithProduct(),
  ]);

  if (!sale) notFound();

  const action = updateSale.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit sale</h1>
      <SaleForm action={action} variants={variants} defaultValues={sale} submitLabel="Save changes" />
    </div>
  );
}
