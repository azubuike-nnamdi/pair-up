import Link from "next/link"

import { prisma } from "@/lib/db/prisma"
import { capacityFor } from "@/lib/domain"
import { PageHeader } from "@/components/shell"

export default async function AdminDashboardPage() {
  const [people, pockets, pendingApprovals] = await Promise.all([
    prisma.person.findMany({ select: { gender: true, status: true } }),
    prisma.pocket.findMany({
      where: { deletedAt: null },
      select: {
        gender: true,
        status: true,
        type: true,
        _count: {
          select: {
            memberships: { where: { status: { in: ["PENDING", "APPROVED"] } } },
          },
        },
      },
    }),
    prisma.invitation.count({ where: { status: "PENDING" } }),
  ])

  const countPeople = (predicate: (person: (typeof people)[number]) => boolean) =>
    people.filter(predicate).length
  const countPockets = (predicate: (pocket: (typeof pockets)[number]) => boolean) =>
    pockets.filter(predicate).length

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Accommodation allocation for graduate trainees."
      />
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase">People</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat href="/admin/people" label="Total graduate trainees" value={people.length} />
          <Stat href="/admin/people?filter=male" label="Male trainees" value={countPeople((person) => person.gender === "MALE")} />
          <Stat href="/admin/people?filter=female" label="Female trainees" value={countPeople((person) => person.gender === "FEMALE")} />
          <Stat href="/admin/people?filter=allocated" label="Allocated" value={countPeople((person) => person.status === "ALLOCATED")} />
          <Stat href="/admin/people?filter=available" label="Unallocated" value={countPeople((person) => person.status === "AVAILABLE")} />
          <Stat href="/admin/people?filter=pending" label="Pending" value={countPeople((person) => person.status === "PENDING")} />
        </div>
      </section>
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase">Pockets</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat href="/admin/pockets" label="Total pockets" value={pockets.length} />
          <Stat href="/admin/pockets?filter=male" label="Male pockets" value={countPockets((pocket) => pocket.gender === "MALE")} />
          <Stat href="/admin/pockets?filter=female" label="Female pockets" value={countPockets((pocket) => pocket.gender === "FEMALE")} />
          <Stat href="/admin/pockets?filter=available" label="Available" value={countPockets((pocket) => pocket.status === "AVAILABLE")} />
          <Stat href="/admin/pockets?filter=pending" label="Pending" value={countPockets((pocket) => pocket.status === "PENDING")} />
          <Stat href="/admin/pockets?filter=confirmed" label="Confirmed" value={countPockets((pocket) => pocket.status === "CONFIRMED")} />
          <Stat href="/admin/pockets?filter=locked" label="Locked" value={countPockets((pocket) => pocket.status === "LOCKED")} />
          <Stat
            href="/admin/pockets?filter=full"
            label="Full"
            value={countPockets(
              (pocket) => pocket._count.memberships === capacityFor(pocket.type) && pocket.status !== "AVAILABLE"
            )}
          />
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase">Allocation</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat href="/admin/people?filter=allocated" label="Total allocated people" value={countPeople((person) => person.status === "ALLOCATED")} />
          <Stat href="/admin/people?filter=available" label="Total unallocated people" value={countPeople((person) => person.status === "AVAILABLE")} />
          <Stat href="/admin/approvals" label="Pending approvals" value={pendingApprovals} />
        </div>
      </section>
      <p className="mt-8">
        <Link href="/admin/export/allocations" className="text-sm underline underline-offset-4">
          Export allocation report
        </Link>
      </p>
    </div>
  )
}

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="block border px-4 py-3 hover:bg-muted">
      <div className="text-xs tracking-widest text-muted-foreground uppercase">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Link>
  )
}
