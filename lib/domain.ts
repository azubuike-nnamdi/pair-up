import type { $Enums } from "@prisma/client"
import { z } from "zod"

type Gender = $Enums.Gender
type PocketType = $Enums.PocketType

export const POCKET_CAPACITY: Record<PocketType, number> = {
  TYPE_1: 1,
  TYPE_2: 2,
  TYPE_3: 3,
}

export const ACTIVE_MEMBERSHIP = ["PENDING", "APPROVED"] as const

export const UNAUTHORIZED_TITLE =
  "You are not authorized to access this application."
export const UNAUTHORIZED_BODY =
  "Your email address is not registered as an eligible graduate trainee. Please contact the administrator if you believe this is an error."

export const DUPLICATE_EMAIL =
  "A graduate trainee with this email already exists."

export function capacityFor(type: PocketType) {
  return POCKET_CAPACITY[type]
}

export function partnersRequired(type: PocketType) {
  return capacityFor(type) - 1
}

export function typeLabel(type: PocketType) {
  if (type === "TYPE_1") return "Type 1"
  if (type === "TYPE_2") return "Type 2"
  return "Type 3"
}

export function peopleLabel(count: number) {
  return count === 1 ? "1 person" : `${count} people`
}

export function genderLabel(gender: Gender) {
  return gender === "MALE" ? "Male" : "Female"
}

export function genderCode(gender: Gender) {
  return gender === "MALE" ? "M" : "F"
}

export function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`
}

export function occupancyLabel(occupied: number, capacity: number) {
  return `${occupied} / ${capacity}`
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  )
}

export function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/home"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/home"
  }
  return value
}

const countSchema = z.number().int().min(0).max(500)

export const distributionSchema = z.object({
  male: z.object({
    type1: countSchema,
    type2: countSchema,
    type3: countSchema,
  }),
  female: z.object({
    type1: countSchema,
    type2: countSchema,
    type3: countSchema,
  }),
})

export type PocketDistribution = z.infer<typeof distributionSchema>

export function distributionTotal(distribution: PocketDistribution) {
  const groups = [distribution.male, distribution.female]
  return groups.reduce(
    (sum, group) => sum + group.type1 + group.type2 + group.type3,
    0
  )
}

export type PlannedPocket = {
  name: string
  type: PocketType
  gender: Gender
  capacity: number
}

export function planPockets(
  prefix: string,
  distribution: PocketDistribution,
  start: { M: number; F: number }
) {
  const plans: PlannedPocket[] = []
  const counters = { M: start.M, F: start.F }
  const groups = [
    { gender: "MALE" as const, code: "M" as const, counts: distribution.male },
    {
      gender: "FEMALE" as const,
      code: "F" as const,
      counts: distribution.female,
    },
  ]

  for (const group of groups) {
    const types = [
      ["TYPE_1", group.counts.type1],
      ["TYPE_2", group.counts.type2],
      ["TYPE_3", group.counts.type3],
    ] as const
    for (const [type, count] of types) {
      for (let index = 0; index < count; index += 1) {
        const sequence = counters[group.code]
        counters[group.code] += 1
        plans.push({
          name: `${prefix} - ${group.code}${String(sequence).padStart(3, "0")}`,
          type,
          gender: group.gender,
          capacity: capacityFor(type),
        })
      }
    }
  }

  return plans
}

export function nextSequences(names: string[], prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const male = new RegExp(`^${escaped} - M(\\d+)$`)
  const female = new RegExp(`^${escaped} - F(\\d+)$`)
  let maleMax = 0
  let femaleMax = 0
  for (const name of names) {
    const maleMatch = male.exec(name)
    const femaleMatch = female.exec(name)
    if (maleMatch) maleMax = Math.max(maleMax, Number(maleMatch[1]))
    if (femaleMatch) femaleMax = Math.max(femaleMax, Number(femaleMatch[1]))
  }
  return { M: maleMax + 1, F: femaleMax + 1 }
}

export const personSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.email("Enter a valid email address"),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Enter a valid phone number"),
  gender: z.enum(["MALE", "FEMALE"], { message: "Gender is required" }),
})

export type PersonInput = z.infer<typeof personSchema>

export function parseGender(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === "male" || normalized === "m") return "MALE" as const
  if (normalized === "female" || normalized === "f") return "FEMALE" as const
  return null
}

export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const input = text.replace(/^\uFEFF/, "")

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(cell.trim())
      cell = ""
    } else if (char === "\n") {
      row.push(cell.trim())
      cell = ""
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else if (char !== "\r") {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value)
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
}

export function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function zodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again."
}

export class AppError extends Error {}
