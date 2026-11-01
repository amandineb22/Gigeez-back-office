import { createReseller } from "@/lib/actions/resellers";
import { ResellerForm } from "../ResellerForm";

export default function NewResellerPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add reseller</h1>
      <ResellerForm action={createReseller} submitLabel="Add reseller" />
    </div>
  );
}
