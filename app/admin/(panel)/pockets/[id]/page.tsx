import { notFound } from "next/navigation"

import { PocketActions } from "@/components/pockets/pocket-actions"
import { PageHeader } from "@/components/shell"
import { StatusBadge } from "@/components/status-badge"
import { prisma } from "@/lib/db/prisma"
import { capacityFor, fullName, occupancyLabel, typeLabel } from "@/lib/domain"

export default async function PocketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pocket = await prisma.pocket.findFirst({
    where: { id, deletedAt: null },
    include: {
      memberships: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        include: { person: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!pocket) notFound()

  const capacity = capacityFor(pocket.type)
  const occupants = [...pocket.memberships].sort((left, right) =>
    left.role === right.role ? 0 : left.role === "INITIATOR" ? -1 : 1
  )
  const openSeats = Math.max(capacity - occupants.length, 0)

  return (
    <div>
      <PageHeader
        title={pocket.name}
        description="Pocket"
        action={
          <PocketActions
            pocketId={pocket.id}
            name={pocket.name}
            occupied={occupants.length > 0}
            canBook={pocket.status === "AVAILABLE"}
            returnToList
          />
        }
      />
      <dl className="mb-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">Gender</dt>
          <dd className="mt-1"><StatusBadge value={pocket.gender} /></dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">Type</dt>
          <dd className="mt-1">{typeLabel(pocket.type)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">Capacity</dt>
          <dd className="mt-1">{capacity}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">Occupancy</dt>
          <dd className="mt-1">{occupancyLabel(occupants.length, capacity)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">Status</dt>
          <dd className="mt-1"><StatusBadge value={pocket.status} /></dd>
        </div>
      </dl>
      <h2 className="mb-3 font-heading text-lg tracking-wider uppercase">Occupants</h2>
      <ol className="grid gap-3">
        {occupants.map((membership, index) => (
          <li key={membership.id} className="border px-4 py-3 text-sm">
            <p className="font-medium">{index + 1}. {fullName(membership.person)}</p>
            <p className="text-muted-foreground">{membership.person.email}</p>
            <div className="mt-2">
              <StatusBadge value={membership.status} />
            </div>
          </li>
        ))}
        {Array.from({ length: openSeats }, (_, index) => (
          <li key={`open-${index}`} className="border border-dashed px-4 py-3 text-sm text-muted-foreground">
            {occupants.length + index + 1}. Waiting for participant
          </li>
        ))}
      </ol>
    </div>
  )
}
