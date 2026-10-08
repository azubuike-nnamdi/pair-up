import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/guards"
import { clearSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import {
  capacityFor,
  formatWhen,
  fullName,
  genderLabel,
  occupancyLabel,
  statusLabel,
  toCsv,
  typeLabel,
} from "@/lib/domain"

type AllocationPerson = Prisma.PersonGetPayload<{
  include: {
    memberships: {
      include: {
        pocket: {
          include: {
            memberships: { include: { person: true } }
          }
        }
      }
    }
  }
}>

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    await clearSession()
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { kind } = await context.params
  if (kind === "people") {
    const people = await prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        memberships: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          include: { pocket: true },
          take: 1,
        },
      },
    })
    const csv = toCsv(
      ["First name", "Last name", "Email", "Phone", "Gender", "Pocket", "Allocation status"],
      people.map((person) => [
        person.firstName,
        person.lastName,
        person.email,
        person.phoneNumber,
        genderLabel(person.gender),
        person.memberships[0]?.pocket.name ?? "",
        statusLabel(person.status),
      ])
    )
    return csvFile("people.csv", csv)
  }

  if (kind === "pockets") {
    const pockets = await prisma.pocket.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        memberships: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          include: { person: true },
        },
      },
    })
    const csv = toCsv(
      ["Pocket name", "Gender", "Type", "Capacity", "Current occupants", "Status", "Created date"],
      pockets.map((pocket) => [
        pocket.name,
        genderLabel(pocket.gender),
        typeLabel(pocket.type),
        capacityFor(pocket.type),
        occupancyLabel(pocket.memberships.length, capacityFor(pocket.type)),
        statusLabel(pocket.status),
        formatWhen(pocket.createdAt),
      ])
    )
    return csvFile("pockets.csv", csv)
  }

  if (kind === "allocations") {
    const people: AllocationPerson[] = await prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        memberships: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          include: {
            pocket: {
              include: {
                memberships: {
                  where: { status: { in: ["PENDING", "APPROVED"] } },
                  include: { person: true },
                },
              },
            },
          },
          take: 1,
        },
      },
    })
    const csv = toCsv(
      ["Person", "Email", "Gender", "Pocket", "Pocket type", "Roommates", "Allocation status", "Approval status"],
      people.map((person: AllocationPerson) => {
        const membership = person.memberships[0]
        const roommates =
          membership?.pocket.memberships
            .filter((item) => item.personId !== person.id)
            .map((item) => fullName(item.person))
            .join("; ") ?? ""
        return [
          fullName(person),
          person.email,
          genderLabel(person.gender),
          membership?.pocket.name ?? "",
          membership ? typeLabel(membership.pocket.type) : "",
          roommates,
          statusLabel(person.status),
          membership ? statusLabel(membership.status) : "",
        ]
      })
    )
    return csvFile("allocations.csv", csv)
  }

  return NextResponse.json({ error: "Unknown export" }, { status: 404 })
}

function csvFile(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
