import { getAllSuppliers } from "@/lib/data/suppliers";
import { deleteSupplier } from "@/lib/actions/suppliers";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function SuppliersPage() {
  const suppliers = await getAllSuppliers();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Suppliers</h1>
        <LinkButton href="/suppliers/new" size="sm">
          Add supplier
        </LinkButton>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add a supplier so you can log purchase orders against them."
          actionLabel="Add supplier"
          actionHref="/suppliers/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Lead time</Th>
                <Th>Notes</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {suppliers.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium text-ink">{s.name}</Td>
                  <Td>{s.contact ?? "—"}</Td>
                  <Td>{s.lead_time_days !== null ? `${s.lead_time_days} days` : "—"}</Td>
                  <Td className="max-w-xs truncate">{s.notes ?? "—"}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton href={`/suppliers/${s.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deleteSupplier.bind(null, s.id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this supplier?">Delete</ConfirmSubmitButton>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
