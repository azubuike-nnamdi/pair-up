import { PageHeader } from "@/components/shell"
import { TablePagination } from "@/components/table-pagination"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { prisma } from "@/lib/db/prisma"
import { formatWhen, fullName } from "@/lib/domain"
import { tablePage } from "@/lib/table-page"
import type { Prisma } from "@prisma/client"

type ListedInvitation = Prisma.InvitationGetPayload<{
  include: { pocket: true; requester: true; invitee: true }
}>

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; rows?: string }>
}) {
  const params = await searchParams
  const where = { status: "PENDING" } as const
  const total = await prisma.invitation.count({ where })
  const { page, rows } = tablePage(total, params)
  const invitations: ListedInvitation[] = await prisma.invitation.findMany({
    where,
    include: { pocket: true, requester: true, invitee: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * rows,
    take: rows,
  })

  return (
    <div>
      <PageHeader title="Approvals" description="Partner invitations that are still waiting." />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pocket</TableHead>
            <TableHead>Requested by</TableHead>
            <TableHead>Invitee</TableHead>
            <TableHead>Sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No approvals are waiting.
              </TableCell>
            </TableRow>
          ) : (
            invitations.map((invitation: ListedInvitation) => (
              <TableRow key={invitation.id}>
                <TableCell>{invitation.pocket.name}</TableCell>
                <TableCell>{fullName(invitation.requester)}</TableCell>
                <TableCell>{fullName(invitation.invitee)}</TableCell>
                <TableCell>{formatWhen(invitation.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination base="/admin/approvals" page={page} rows={rows} total={total} />
    </div>
  )
}
