import { PocketStatus, Prisma } from "@prisma/client"

import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import {
  AppError,
  appUrl,
  capacityFor,
  fullName,
  partnersRequired,
  typeLabel,
} from "@/lib/domain"
import { sendInvitationEmail } from "@/lib/mail/messages"
import { releaseOccupants } from "@/lib/pockets"
import { createToken, hashToken } from "@/lib/auth/session"

const INVITE_MS = 7 * 24 * 60 * 60 * 1000

function isConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

export async function selectPocket(input: {
  personId: string
  pocketId: string
  partnerIds: string[]
}) {
  const partnerIds = [...new Set(input.partnerIds)]
  if (partnerIds.includes(input.personId)) {
    throw new AppError("You cannot select yourself.")
  }

  let prepared: {
    invites: Array<{ to: string; inviteeName: string; token: string }>
    pocket: { id: string; name: string; type: "TYPE_1" | "TYPE_2" | "TYPE_3" }
    person: { firstName: string; lastName: string; id: string }
    required: number
  }
  try {
    prepared = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${input.pocketId} FOR UPDATE`
    const personIds = [input.personId, ...partnerIds].sort()
    await tx.$queryRaw`SELECT id FROM "Person" WHERE id IN (${Prisma.join(personIds)}) FOR UPDATE`

    const person = await tx.person.findUnique({ where: { id: input.personId } })
    const pocket = await tx.pocket.findFirst({
      where: { id: input.pocketId, deletedAt: null },
    })
    if (!person) throw new AppError("Unauthorized")
    if (person.status !== "AVAILABLE") {
      throw new AppError("You already have an accommodation selection.")
    }
    if (!pocket || pocket.status !== "AVAILABLE") {
      throw new AppError("This pocket is no longer available.")
    }
    const occupied = await tx.membership.count({
      where: { pocketId: pocket.id, status: { in: ["PENDING", "APPROVED"] } },
    })
    if (occupied >= capacityFor(pocket.type)) {
      await tx.pocket.update({
        where: { id: pocket.id },
        data: { status: PocketStatus.BOOKED },
      })
      throw new AppError("This pocket is no longer available.")
    }
    if (pocket.gender !== person.gender) {
      throw new AppError("You can only select a pocket that matches your gender.")
    }

    const required = partnersRequired(pocket.type)
    if (partnerIds.length !== required) {
      throw new AppError(
        required === 0
          ? "This pocket does not need a partner."
          : `Select ${required} ${required === 1 ? "person" : "people"} to join this pocket.`
      )
    }

    const partners =
      partnerIds.length === 0
        ? []
        : await tx.person.findMany({ where: { id: { in: partnerIds } } })
    if (partners.length !== partnerIds.length) {
      throw new AppError("One of the selected people is no longer available.")
    }
    for (const partner of partners) {
      if (partner.gender !== person.gender || partner.status !== "AVAILABLE") {
        throw new AppError("One of the selected people is not eligible.")
      }
    }

    const now = new Date()
    await tx.membership.create({
      data: {
        personId: person.id,
        pocketId: pocket.id,
        role: "INITIATOR",
        status: "APPROVED",
        activePersonKey: person.id,
        joinedAt: now,
      },
    })

    const invites: Array<{
      to: string
      inviteeName: string
      token: string
    }> = []

    if (required === 0) {
      await tx.person.update({
        where: { id: person.id },
        data: { status: "ALLOCATED" },
      })
      await tx.pocket.update({
        where: { id: pocket.id },
        data: { status: PocketStatus.BOOKED },
      })
      await writeAudit(tx, {
        action: "ACCOMMODATION_REQUESTED",
        actorType: "person",
        actorId: person.id,
        entityType: "pocket",
        entityId: pocket.id,
        summary: `${fullName(person)} booked ${pocket.name}`,
      })
      await writeAudit(tx, {
        action: "POCKET_CONFIRMED",
        actorType: "person",
        actorId: person.id,
        entityType: "pocket",
        entityId: pocket.id,
        summary: `${pocket.name} booked`,
      })
      return { invites, pocket, person, required }
    }

    await tx.person.update({
      where: { id: person.id },
      data: { status: "PENDING" },
    })
    await tx.pocket.update({
      where: { id: pocket.id },
      data: { status: "PENDING" },
    })

    for (const partner of partners) {
      const token = createToken()
      await tx.membership.create({
        data: {
          personId: partner.id,
          pocketId: pocket.id,
          role: "PARTNER",
          status: "PENDING",
          activePersonKey: partner.id,
        },
      })
      await tx.person.update({
        where: { id: partner.id },
        data: { status: "PENDING" },
      })
      await tx.invitation.create({
        data: {
          pocketId: pocket.id,
          requesterId: person.id,
          inviteeId: partner.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + INVITE_MS),
        },
      })
      invites.push({
        to: partner.email,
        inviteeName: fullName(partner),
        token,
      })
    }

    await writeAudit(tx, {
      action: "ACCOMMODATION_REQUESTED",
      actorType: "person",
      actorId: person.id,
      entityType: "pocket",
      entityId: pocket.id,
      summary: `${fullName(person)} requested ${pocket.name}`,
    })

    return { invites, pocket, person, required }
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    if (isConflict(error)) {
      throw new AppError("Someone in this selection is no longer available.")
    }
    throw error
  }

  if (prepared.invites.length === 0) {
    return
  }

  try {
    for (const invite of prepared.invites) {
      await sendInvitationEmail({
        to: invite.to,
        inviteeName: invite.inviteeName,
        requesterName: fullName(prepared.person),
        pocketName: prepared.pocket.name,
        typeLabel: typeLabel(prepared.pocket.type),
        url: `${appUrl()}/invite/${invite.token}`,
      })
      await writeAudit(prisma, {
        action: "PARTNER_INVITATION_SENT",
        actorType: "person",
        actorId: prepared.person.id,
        entityType: "pocket",
        entityId: prepared.pocket.id,
        summary: `Invitation sent to ${invite.inviteeName} for ${prepared.pocket.name}`,
      })
    }
  } catch {
    await prisma.$transaction(async (tx) => {
      await releaseOccupants(tx, prepared.pocket.id)
      await tx.pocket.update({
        where: { id: prepared.pocket.id },
        data: { status: "AVAILABLE" },
      })
      await writeAudit(tx, {
        action: "POCKET_RELEASED",
        actorType: "system",
        entityType: "pocket",
        entityId: prepared.pocket.id,
        summary: `Released ${prepared.pocket.name} because an approval email failed`,
      })
    })
    throw new AppError(
      "The approval email could not be sent, so the selection was cancelled. Please try again."
    )
  }
}

export async function respondToInvitation(input: {
  personId: string
  decision: "approve" | "decline"
  token?: string
  invitationId?: string
}) {
  const invitation = input.token
    ? await prisma.invitation.findUnique({
        where: { tokenHash: hashToken(input.token) },
        include: { pocket: true, invitee: true, requester: true },
      })
    : await prisma.invitation.findUnique({
        where: { id: input.invitationId ?? "" },
        include: { pocket: true, invitee: true, requester: true },
      })
  if (!invitation || invitation.inviteeId !== input.personId) {
    throw new AppError("This invitation is not available to you.")
  }
  if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    throw new AppError("This invitation is no longer active.")
  }

  if (input.decision === "decline") {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${invitation.pocketId} FOR UPDATE`
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED", declinedAt: new Date() },
      })
      await writeAudit(tx, {
        action: "PARTNER_DECLINED",
        actorType: "person",
        actorId: input.personId,
        entityType: "invitation",
        entityId: invitation.id,
        summary: `${fullName(invitation.invitee)} declined ${invitation.pocket.name}`,
      })
      await releaseOccupants(tx, invitation.pocketId)
      await tx.pocket.update({
        where: { id: invitation.pocketId },
        data: { status: "AVAILABLE" },
      })
      await writeAudit(tx, {
        action: "POCKET_RELEASED",
        actorType: "person",
        actorId: input.personId,
        entityType: "pocket",
        entityId: invitation.pocketId,
        summary: `${invitation.pocket.name} was released after a decline`,
      })
    })
    return "declined" as const
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Pocket" WHERE id = ${invitation.pocketId} FOR UPDATE`
    const current = await tx.invitation.findUnique({ where: { id: invitation.id } })
    if (!current || current.status !== "PENDING") {
      throw new AppError("This invitation is no longer active.")
    }
    const now = new Date()
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "APPROVED", approvedAt: now },
    })
    await tx.membership.updateMany({
      where: {
        pocketId: invitation.pocketId,
        personId: invitation.inviteeId,
        status: "PENDING",
      },
      data: { status: "APPROVED", joinedAt: now },
    })
    await writeAudit(tx, {
      action: "PARTNER_APPROVED",
      actorType: "person",
      actorId: input.personId,
      entityType: "invitation",
      entityId: invitation.id,
      summary: `${fullName(invitation.invitee)} approved ${invitation.pocket.name}`,
    })

    const stillPending = await tx.invitation.count({
      where: { pocketId: invitation.pocketId, status: "PENDING" },
    })
    if (stillPending === 0) {
      const members = await tx.membership.findMany({
        where: {
          pocketId: invitation.pocketId,
          status: { in: ["PENDING", "APPROVED"] },
        },
        select: { personId: true },
      })
      const capacity = capacityFor(invitation.pocket.type)
      if (members.length !== capacity) {
        throw new AppError("This pocket cannot be booked yet.")
      }
      await tx.pocket.update({
        where: { id: invitation.pocketId },
        data: { status: PocketStatus.BOOKED },
      })
      await tx.person.updateMany({
        where: { id: { in: members.map((member) => member.personId) } },
        data: { status: "ALLOCATED" },
      })
      await writeAudit(tx, {
        action: "POCKET_CONFIRMED",
        actorType: "person",
        actorId: input.personId,
        entityType: "pocket",
        entityId: invitation.pocketId,
        summary: `${invitation.pocket.name} booked`,
      })
    }
  })

  return "approved" as const
}

export async function expireStaleSelections() {
  const stale = await prisma.invitation.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { pocketId: true, pocket: { select: { name: true } } },
  })
  const seen = new Set<string>()
  for (const invitation of stale) {
    if (seen.has(invitation.pocketId)) continue
    seen.add(invitation.pocketId)
    await prisma.$transaction(async (tx) => {
      await releaseOccupants(tx, invitation.pocketId)
      await tx.pocket.updateMany({
        where: { id: invitation.pocketId, deletedAt: null, status: "PENDING" },
        data: { status: "AVAILABLE" },
      })
      await writeAudit(tx, {
        action: "POCKET_RELEASED",
        actorType: "system",
        entityType: "pocket",
        entityId: invitation.pocketId,
        summary: `${invitation.pocket.name} was released because an invitation expired`,
      })
    })
  }
}

export async function eligiblePockets(gender: "MALE" | "FEMALE") {
  const pockets = await prisma.pocket.findMany({
    where: { gender, status: "AVAILABLE", deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { memberships: { where: { status: { in: ["PENDING", "APPROVED"] } } } },
      },
    },
  })
  return pockets.filter((pocket) => pocket._count.memberships < capacityFor(pocket.type))
}

export async function eligiblePartners(personId: string, gender: "MALE" | "FEMALE") {
  return prisma.person.findMany({
    where: { gender, status: "AVAILABLE", id: { not: personId } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })
}
