import { PocketStatus, Prisma } from "@prisma/client"

import { writeAudit } from "@/lib/audit"
import { prisma, type Db } from "@/lib/db/prisma"
import {
  AppError,
  distributionSchema,
  distributionTotal,
  nextSequences,
  planPockets,
  type PocketDistribution,
} from "@/lib/domain"

const PREFIX = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/

export async function releaseOccupants(db: Db, pocketId: string) {
  const memberships: { personId: string }[] = await db.membership.findMany({
    where: { pocketId, status: { in: ["PENDING", "APPROVED"] } },
    select: { personId: true },
  })
  const personIds = memberships.map((membership) => membership.personId)

  if (personIds.length > 0) {
    await db.membership.updateMany({
      where: { pocketId, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "RELEASED", activePersonKey: null },
    })
    await db.person.updateMany({
      where: { id: { in: personIds } },
      data: { status: "AVAILABLE" },
    })
  }

  await db.invitation.updateMany({
    where: { pocketId, status: "PENDING" },
    data: { status: "EXPIRED" },
  })

  return personIds
}

export async function createSinglePocket(
  adminId: string,
  input: { name: string; type: "TYPE_1" | "TYPE_2" | "TYPE_3"; gender: "MALE" | "FEMALE" }
) {
  const name = input.name.trim()
  if (name.length < 2 || name.length > 80) {
    throw new AppError("Enter a pocket name.")
  }

  try {
    const pocket = await prisma.pocket.create({
      data: {
        name,
        type: input.type,
        gender: input.gender,
      },
    })
    await writeAudit(prisma, {
      action: "POCKET_CREATED",
      actorType: "admin",
      actorId: adminId,
      entityType: "pocket",
      entityId: pocket.id,
      summary: `Created ${pocket.name}`,
    })
    return pocket
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("A pocket with this name already exists.")
    }
    throw error
  }
}

export async function createBulkPockets(
  adminId: string,
  input: { prefix: string; total: number; distribution: PocketDistribution }
) {
  const prefix = input.prefix.trim()
  if (!PREFIX.test(prefix)) {
    throw new AppError("Enter a pocket name prefix using letters, numbers, spaces, or hyphens.")
  }
  const distribution = distributionSchema.parse(input.distribution)
  const configured = distributionTotal(distribution)
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > 500) {
    throw new AppError("Enter how many pockets to create, up to 500.")
  }
  if (configured !== input.total) {
    throw new AppError("The pocket distribution must equal the total number of pockets.")
  }

  const existing: { name: string }[] = await prisma.pocket.findMany({
    where: { name: { startsWith: `${prefix} - ` } },
    select: { name: true },
  })
  const plans = planPockets(prefix, distribution, nextSequences(existing.map((pocket) => pocket.name), prefix))
  if (plans.length !== input.total) {
    throw new AppError("The pocket distribution must equal the total number of pockets.")
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pocket.createMany({
        data: plans.map((plan) => ({
          name: plan.name,
          type: plan.type,
          gender: plan.gender,
          status: "AVAILABLE",
        })),
      })
      await writeAudit(tx, {
        action: "BULK_POCKETS_CREATED",
        actorType: "admin",
        actorId: adminId,
        entityType: "pocket",
        summary: `Created ${plans.length} pockets with prefix ${prefix}`,
      })
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("A pocket name in this batch already exists. Change the prefix and try again.")
    }
    throw error
  }

  return plans.length
}

export async function deletePocket(adminId: string, pocketId: string) {
  const pocket = await prisma.pocket.findFirst({
    where: { id: pocketId, deletedAt: null },
  })
  if (!pocket) {
    throw new AppError("Pocket not found.")
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const released = await releaseOccupants(tx, pocketId)
    await tx.pocket.update({
      where: { id: pocketId },
      data: { deletedAt: new Date() },
    })
    await writeAudit(tx, {
      action: "POCKET_DELETED",
      actorType: "admin",
      actorId: adminId,
      entityType: "pocket",
      entityId: pocketId,
      summary: `Deleted ${pocket.name}`,
    })
    if (released.length > 0) {
      await writeAudit(tx, {
        action: "POCKET_RELEASED",
        actorType: "admin",
        actorId: adminId,
        entityType: "pocket",
        entityId: pocketId,
        summary: `Released ${released.length} occupants from ${pocket.name}`,
      })
    }
  })
}

export async function bookPocket(adminId: string, pocketId: string) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${pocketId} FOR UPDATE`
    const pocket = await tx.pocket.findFirst({
      where: { id: pocketId, deletedAt: null },
    })
    if (!pocket) throw new AppError("Pocket not found.")
    if (pocket.status !== "AVAILABLE") {
      throw new AppError("Only an available pocket can be booked.")
    }
    await tx.pocket.update({
      where: { id: pocketId },
      data: { status: PocketStatus.BOOKED },
    })
    await writeAudit(tx, {
      action: "POCKET_LOCKED",
      actorType: "admin",
      actorId: adminId,
      entityType: "pocket",
      entityId: pocketId,
      summary: `Booked ${pocket.name}`,
    })
  })
}

export function pocketWhere(filter: string) {
  const where: Prisma.PocketWhereInput = { deletedAt: null }
  if (filter === "male") where.gender = "MALE"
  if (filter === "female") where.gender = "FEMALE"
  if (filter === "available") where.status = "AVAILABLE"
  if (filter === "pending") where.status = "PENDING"
  if (filter === "booked") where.status = PocketStatus.BOOKED
  return where
}
