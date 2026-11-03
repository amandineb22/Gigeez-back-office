import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateReseller } from "@/lib/actions/resellers";
import { ResellerForm } from "../../ResellerForm";

export default async function EditResellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: reseller } = await supabase.from("resellers").select("*").eq("id", id).single();
  if (!reseller) notFound();

  const action = updateReseller.bind(null, id);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Edit reseller</h1>
      <ResellerForm action={action} defaultValues={reseller} submitLabel="Save changes" />
    </div>
  );
}
