import { Prisma, type Gender } from "@prisma/client"

import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import {
  AppError,
  DUPLICATE_EMAIL,
  parseCsv,
  parseGender,
  personSchema,
  type PersonInput,
} from "@/lib/domain"

function isUniqueEmail(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export async function createPerson(adminId: string, input: PersonInput) {
  const email = input.email.toLowerCase()
  try {
    const person = await prisma.person.create({
      data: { ...input, email },
    })
    await writeAudit(prisma, {
      action: "PERSON_CREATED",
      actorType: "admin",
      actorId: adminId,
      entityType: "person",
      entityId: person.id,
      summary: `Added ${person.firstName} ${person.lastName}`,
    })
    return person
  } catch (error) {
    if (isUniqueEmail(error)) {
      throw new AppError(DUPLICATE_EMAIL)
    }
    throw error
  }
}

export async function deletePerson(adminId: string, personId: string) {
  const person = await prisma.person.findUnique({ where: { id: personId } })
  if (!person) {
    throw new AppError("Graduate trainee not found.")
  }
  if (person.status !== "AVAILABLE") {
    throw new AppError(
      "This graduate trainee is part of an accommodation selection and cannot be deleted."
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.magicLink.deleteMany({ where: { personId } })
    await tx.invitation.deleteMany({
      where: { OR: [{ requesterId: personId }, { inviteeId: personId }] },
    })
    await tx.membership.deleteMany({ where: { personId } })
    await tx.person.delete({ where: { id: personId } })
    await writeAudit(tx, {
      action: "PERSON_DELETED",
      actorType: "admin",
      actorId: adminId,
      entityType: "person",
      entityId: personId,
      summary: `Deleted ${person.firstName} ${person.lastName}`,
    })
  })
}

export type ImportRow = PersonInput & { email: string }

export type ImportPreview = {
  total: number
  valid: ImportRow[]
  duplicateEmails: string[]
  invalid: { row: number; message: string }[]
}

export async function previewPeopleImport(csv: string): Promise<ImportPreview> {
  const table = parseCsv(csv)
  if (table.length === 0) {
    throw new AppError("The CSV file is empty.")
  }
  const headers = table[0].map((header) => header.trim())
  const expected = ["firstName", "lastName", "email", "gender"]
  if (expected.some((header, index) => headers[index] !== header)) {
    throw new AppError("CSV headers must be firstName,lastName,email,gender.")
  }

  const existing = new Set(
    (
      await prisma.person.findMany({ select: { email: true } })
    ).map((person) => person.email.toLowerCase())
  )
  const seen = new Set<string>()
  const valid: ImportRow[] = []
  const duplicateEmails: string[] = []
  const invalid: { row: number; message: string }[] = []

  table.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2
    const gender = parseGender(cells[3] ?? "")
    const parsed = personSchema.safeParse({
      firstName: cells[0] ?? "",
      lastName: cells[1] ?? "",
      email: (cells[2] ?? "").toLowerCase(),
      gender: gender ?? "",
    })
    if (!parsed.success) {
      invalid.push({
        row: rowNumber,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      })
      return
    }
    const email = parsed.data.email.toLowerCase()
    if (existing.has(email) || seen.has(email)) {
      duplicateEmails.push(email)
      return
    }
    seen.add(email)
    valid.push({ ...parsed.data, email })
  })

  return {
    total: Math.max(table.length - 1, 0),
    valid,
    duplicateEmails,
    invalid,
  }
}

export async function importPeople(adminId: string, rows: ImportRow[]) {
  if (rows.length === 0) {
    throw new AppError("There are no valid rows to import.")
  }

  const created = await prisma.$transaction(async (tx) => {
    const inserted = []
    for (const row of rows) {
      const email = row.email.toLowerCase()
      const exists = await tx.person.findUnique({ where: { email } })
      if (exists) continue
      const parsed = personSchema.parse({ ...row, email })
      inserted.push(
        await tx.person.create({
          data: { ...parsed, email },
        })
      )
    }
    if (inserted.length === 0) {
      throw new AppError("Every row is already in the people list.")
    }
    await writeAudit(tx, {
      action: "PERSON_IMPORTED",
      actorType: "admin",
      actorId: adminId,
      entityType: "person",
      summary: `Imported ${inserted.length} graduate trainees`,
    })
    return inserted
  })

  return created
}

export function peopleWhere(filter: string, query: string) {
  const where: Prisma.PersonWhereInput = {}
  if (filter === "male") where.gender = "MALE"
  if (filter === "female") where.gender = "FEMALE"
  if (filter === "available") where.status = "AVAILABLE"
  if (filter === "pending") where.status = "PENDING"
  if (filter === "allocated") where.status = "ALLOCATED"

  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length > 0) {
    where.AND = words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { email: { contains: word, mode: "insensitive" } },
      ],
    }))
  }
  return where
}

export function isGender(value: string): value is Gender {
  return value === "MALE" || value === "FEMALE"
}
