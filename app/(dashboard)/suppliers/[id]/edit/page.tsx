import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSupplier } from "@/lib/actions/suppliers";
import { SupplierForm } from "../../SupplierForm";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (!supplier) notFound();

  const action = updateSupplier.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit supplier</h1>
      <SupplierForm action={action} defaultValues={supplier} submitLabel="Save changes" />
    </div>
  );
}
