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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AddPersonDialog } from "@/components/people/add-person-dialog"
import { DeletePersonButton } from "@/components/people/delete-person-button"
import { ImportDialog } from "@/components/people/import-dialog"
import { FilterLinks, PageHeader } from "@/components/shell"
import { StatusBadge } from "@/components/status-badge"
import { prisma } from "@/lib/db/prisma"
import { peopleWhere } from "@/lib/people"

const filters = [
  ["all", "All"],
  ["male", "Male"],
  ["female", "Female"],
  ["available", "Available"],
  ["pending", "Pending"],
  ["allocated", "Allocated"],
] as Array<[string, string]>

type ListedPerson = Prisma.PersonGetPayload<{
  include: {
    memberships: {
      include: { pocket: { select: { name: true } } }
    }
  }
}>

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""
  const filter = filters.some(([value]) => value === params.filter) ? params.filter ?? "all" : "all"
  const people: ListedPerson[] = await prisma.person.findMany({
    where: peopleWhere(filter, query),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      memberships: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        include: { pocket: { select: { name: true } } },
        take: 1,
      },
    },
  })

  return (
    <div>
      <PageHeader
        title="People"
        description="Eligible graduate trainees."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/export/people" className={buttonVariants({ variant: "outline" })}>
              Export
            </Link>
            <ImportDialog />
            <AddPersonDialog />
          </div>
        }
      />
      <form action="/admin/people" className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <Input className="sm:min-w-0 sm:flex-1" name="q" defaultValue={query} placeholder="Search name or email" />
        {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
        <Button className="w-full sm:w-auto" type="submit" variant="outline">Search</Button>
      </form>
      <div className="mb-4">
        <FilterLinks base="/admin/people" current={filter} query={query} options={filters} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First name</TableHead>
            <TableHead>Last name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Pocket</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                No graduate trainees match this view.
              </TableCell>
            </TableRow>
          ) : (
            people.map((person: ListedPerson) => (
              <TableRow key={person.id}>
                <TableCell>{person.firstName}</TableCell>
                <TableCell>{person.lastName}</TableCell>
                <TableCell>{person.email}</TableCell>
                <TableCell>
                  <StatusBadge value={person.gender} />
                </TableCell>
                <TableCell>{person.memberships[0]?.pocket.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge value={person.status} />
                </TableCell>
                <TableCell>
                  {person.status === "AVAILABLE" ? (
                    <DeletePersonButton
                      personId={person.id}
                      name={`${person.firstName} ${person.lastName}`}
                    />
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
