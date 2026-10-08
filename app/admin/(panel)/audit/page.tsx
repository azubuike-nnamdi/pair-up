import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shell"
import { prisma } from "@/lib/db/prisma"
import { formatWhen, statusLabel } from "@/lib/domain"

export default async function AuditPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div>
      <PageHeader title="Audit" description="Allocation activity, newest first." />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No activity yet.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatWhen(entry.createdAt)}</TableCell>
                <TableCell>{statusLabel(entry.action)}</TableCell>
                <TableCell className="whitespace-normal">{entry.summary}</TableCell>
                <TableCell>{entry.actorType}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
