import type { Prisma } from "@prisma/client"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreatePocketDialog } from "@/components/pockets/create-pocket-dialog"
import { PocketActions } from "@/components/pockets/pocket-actions"
import { FilterLinks, PageHeader } from "@/components/shell"
import { StatusBadge } from "@/components/status-badge"
import { prisma } from "@/lib/db/prisma"
import { capacityFor, formatWhen, occupancyLabel, typeLabel } from "@/lib/domain"
import { pocketWhere } from "@/lib/pockets"

const filters = [
  ["all", "All"],
  ["male", "Male"],
  ["female", "Female"],
  ["available", "Available"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["full", "Full"],
  ["locked", "Locked"],
] as Array<[string, string]>

type ListedPocket = Prisma.PocketGetPayload<{
  include: {
    _count: { select: { memberships: true } }
  }
}>

export default async function PocketsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = filters.some(([value]) => value === params.filter) ? params.filter ?? "all" : "all"
  const pockets: ListedPocket[] = await prisma.pocket.findMany({
    where: pocketWhere(filter === "full" ? "all" : filter),
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { memberships: { where: { status: { in: ["PENDING", "APPROVED"] } } } },
      },
    },
  })
  const visible =
    filter === "full"
      ? pockets.filter(
          (pocket) =>
            pocket._count.memberships === capacityFor(pocket.type) && pocket.status !== "AVAILABLE"
        )
      : pockets

  return (
    <div>
      <PageHeader
        title="Pockets"
        description="Accommodation units and their occupancy."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/export/pockets" className={buttonVariants({ variant: "outline" })}>
              Export
            </Link>
            <CreatePocketDialog />
          </div>
        }
      />
      <div className="mb-4">
        <FilterLinks base="/admin/pockets" current={filter} options={filters} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pocket name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Occupants</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                No pockets match this view.
              </TableCell>
            </TableRow>
          ) : (
            visible.map((pocket: ListedPocket) => {
              const capacity = capacityFor(pocket.type)
              return (
                <TableRow key={pocket.id}>
                  <TableCell>
                    <Link href={`/admin/pockets/${pocket.id}`} className="underline underline-offset-4">
                      {pocket.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={pocket.gender} />
                  </TableCell>
                  <TableCell>{typeLabel(pocket.type)}</TableCell>
                  <TableCell>{capacity}</TableCell>
                  <TableCell>{occupancyLabel(pocket._count.memberships, capacity)}</TableCell>
                  <TableCell>
                    <StatusBadge value={pocket.status} />
                  </TableCell>
                  <TableCell>{formatWhen(pocket.createdAt)}</TableCell>
                  <TableCell>
                    <PocketActions
                      pocketId={pocket.id}
                      name={pocket.name}
                      occupied={pocket._count.memberships > 0}
                      canLock={pocket.status === "AVAILABLE"}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
