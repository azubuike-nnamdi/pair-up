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
import { PocketPagination } from "@/components/pockets/pocket-pagination"
import { FilterLinks, PageHeader } from "@/components/shell"
import { StatusBadge } from "@/components/status-badge"
import { prisma } from "@/lib/db/prisma"
import { capacityFor, formatWhen, occupantNames, typeLabel } from "@/lib/domain"
import { pocketWhere } from "@/lib/pockets"

const PAGE_SIZES = [10, 25, 50]

const filters = [
  ["all", "All"],
  ["male", "Male"],
  ["female", "Female"],
  ["available", "Available"],
  ["pending", "Pending"],
  ["booked", "Booked"],
] as Array<[string, string]>

type ListedPocket = Prisma.PocketGetPayload<{
  include: {
    memberships: { include: { person: true } }
  }
}>

export default async function PocketsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; rows?: string }>
}) {
  const params = await searchParams
  const filter = filters.some(([value]) => value === params.filter) ? params.filter ?? "all" : "all"
  const rows = PAGE_SIZES.includes(Number(params.rows)) ? Number(params.rows) : 10
  const where = pocketWhere(filter)
  const total = await prisma.pocket.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / rows))
  const requested = Math.max(1, Number(params.page) || 1)
  const page = Math.min(requested, pageCount)
  const pockets: ListedPocket[] = await prisma.pocket.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (page - 1) * rows,
    take: rows,
    include: {
      memberships: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        include: { person: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
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
        <FilterLinks
          base="/admin/pockets"
          current={filter}
          options={filters}
          extra={rows === 10 ? undefined : { rows: String(rows) }}
        />
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
          {pockets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                No pockets match this view.
              </TableCell>
            </TableRow>
          ) : (
            pockets.map((pocket: ListedPocket) => {
              const capacity = capacityFor(pocket.type)
              const names = occupantNames(pocket.memberships.map((membership) => membership.person))
              const seats = Math.max(capacity - pocket.memberships.length, 0)
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
                  <TableCell>{names || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={pocket.status} />
                  </TableCell>
                  <TableCell>{formatWhen(pocket.createdAt)}</TableCell>
                  <TableCell>
                    <PocketActions
                      pocketId={pocket.id}
                      name={pocket.name}
                      occupied={pocket.memberships.length > 0}
                      canAssign={seats > 0}
                      seats={seats}
                      gender={pocket.gender}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <PocketPagination page={page} rows={rows} total={total} filter={filter} />
    </div>
  )
}
