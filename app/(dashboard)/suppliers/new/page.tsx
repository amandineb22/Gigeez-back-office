import { createSupplier } from "@/lib/actions/suppliers";
import { SupplierForm } from "../SupplierForm";

export default function NewSupplierPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Add supplier</h1>
      <SupplierForm action={createSupplier} submitLabel="Add supplier" />
    </div>
  );
}
