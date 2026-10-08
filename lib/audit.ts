import type { AuditAction } from "@prisma/client"

import type { Db } from "@/lib/db/prisma"

export async function writeAudit(
  db: Db,
  input: {
    action: AuditAction
    actorType: "admin" | "person" | "system"
    actorId?: string | null
    entityType: string
    entityId?: string | null
    summary: string
  }
) {
  await db.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
    },
  })
}
