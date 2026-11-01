import { getAllResellers } from "@/lib/data/resellers";
import { deleteReseller } from "@/lib/actions/resellers";
import { formatPercent, toTitleCase } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export default async function ResellersPage() {
  const resellers = await getAllResellers();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Resellers</h1>
          <p className="mt-1 text-sm text-ink/50">
            Boutiques, hotels, and stores that sell Gigeez dresses — pick one when logging a sale so revenue reflects
            what Gigeez actually receives, not the full retail price.
          </p>
        </div>
        <LinkButton href="/resellers/new" size="sm">
          Add reseller
        </LinkButton>
      </div>

      {resellers.length === 0 ? (
        <EmptyState
          title="No resellers yet"
          description="Add a consignment or wholesale partner to track what Gigeez actually earns from their sales."
          actionLabel="Add reseller"
          actionHref="/resellers/new"
        />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Currency</Th>
                <Th>Gigeez's share</Th>
                <Th>Notes</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {resellers.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-ink">{r.name}</Td>
                  <Td>
                    <Badge variant={r.type === "wholesale" ? "brand" : "neutral"}>{toTitleCase(r.type)}</Badge>
                  </Td>
                  <Td>{r.currency}</Td>
                  <Td>{formatPercent(r.gigeez_share_pct, 2)}</Td>
                  <Td className="max-w-xs truncate">{r.notes ?? "—"}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <LinkButton href={`/resellers/${r.id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <form action={deleteReseller.bind(null, r.id)}>
                        <ConfirmSubmitButton confirmMessage="Delete this reseller? Existing sales linked to them will become direct sales.">
                          Delete
                        </ConfirmSubmitButton>
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
