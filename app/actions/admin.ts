"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { ActionResult } from "@/app/actions/auth"
import { requireAdmin, requirePerson } from "@/lib/auth/guards"
import { respondToInvitation, selectPocket } from "@/lib/allocation"
import { AppError, distributionTotal, nextSequences, personSchema, planPockets, zodError, type PocketDistribution } from "@/lib/domain"
import {
  createPerson,
  deletePerson,
  importPeople,
  previewPeopleImport,
  type ImportRow,
} from "@/lib/people"
import { createBulkPockets, createSinglePocket, deletePocket, lockPocket } from "@/lib/pockets"
import { prisma } from "@/lib/db/prisma"
import { sendWelcomeEmail } from "@/lib/mail/messages"

function fail(error: unknown): ActionResult {
  if (error instanceof AppError) return { error: error.message }
  return { error: "Something went wrong. Please try again." }
}

export async function addPerson(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const parsed = personSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      phoneNumber: formData.get("phoneNumber"),
      gender: formData.get("gender"),
    })
    if (!parsed.success) return { error: zodError(parsed.error) }
    const person = await createPerson(admin.id, parsed.data)
    revalidatePath("/admin/people")
    revalidatePath("/admin")
    try {
      await sendWelcomeEmail({ to: person.email, firstName: person.firstName })
    } catch {
      return {
        error: "The graduate trainee was added, but the welcome email could not be sent.",
      }
    }
    return {}
  } catch (error) {
    return fail(error)
  }
}

export async function removePerson(personId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    await deletePerson(admin.id, personId)
    revalidatePath("/admin/people")
    revalidatePath("/admin")
    return {}
  } catch (error) {
    return fail(error)
  }
}

export async function reviewPeopleCsv(csv: string) {
  try {
    await requireAdmin()
    return { preview: await previewPeopleImport(csv) }
  } catch (error) {
    return fail(error)
  }
}

export async function commitPeopleImport(rows: ImportRow[]): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const people = await importPeople(admin.id, rows)
    const unsent: string[] = []
    for (const person of people) {
      try {
        await sendWelcomeEmail({ to: person.email, firstName: person.firstName })
      } catch {
        unsent.push(person.email)
      }
    }
    revalidatePath("/admin/people")
    revalidatePath("/admin")
    if (unsent.length > 0) {
      return {
        error: `Imported ${people.length} graduate trainees. Welcome emails could not be sent to ${unsent.join(", ")}.`,
      }
    }
    return { error: undefined, title: `${people.length}` }
  } catch (error) {
    return fail(error)
  }
}

export async function addPocket(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const type = String(formData.get("type"))
    const gender = String(formData.get("gender"))
    if (type !== "TYPE_1" && type !== "TYPE_2" && type !== "TYPE_3") {
      return { error: "Choose a pocket type." }
    }
    if (gender !== "MALE" && gender !== "FEMALE") {
      return { error: "Gender is required." }
    }
    await createSinglePocket(admin.id, {
      name: String(formData.get("name") ?? ""),
      type,
      gender,
    })
    revalidatePath("/admin/pockets")
    revalidatePath("/admin")
    return {}
  } catch (error) {
    return fail(error)
  }
}

export async function previewBulk(input: {
  prefix: string
  total: number
  distribution: PocketDistribution
}) {
  try {
    await requireAdmin()
    const configured = distributionTotal(input.distribution)
    if (configured !== input.total) {
      return { error: "The pocket distribution must equal the total number of pockets." }
    }
    const prefix = input.prefix.trim()
    const existing = await prisma.pocket.findMany({
      where: { name: { startsWith: `${prefix} - ` } },
      select: { name: true },
    })
    const plans = planPockets(
      prefix,
      input.distribution,
      nextSequences(
        existing.map((pocket) => pocket.name),
        prefix
      )
    )
    return {
      total: plans.length,
      sample: plans.slice(0, 8),
      remaining: Math.max(plans.length - 8, 0),
    }
  } catch (error) {
    return fail(error)
  }
}

export async function addBulkPockets(input: {
  prefix: string
  total: number
  distribution: PocketDistribution
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    const count = await createBulkPockets(admin.id, input)
    revalidatePath("/admin/pockets")
    revalidatePath("/admin")
    return { title: String(count) }
  } catch (error) {
    return fail(error)
  }
}

export async function removePocket(pocketId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    await deletePocket(admin.id, pocketId)
    revalidatePath("/admin/pockets")
    revalidatePath(`/admin/pockets/${pocketId}`)
    revalidatePath("/admin")
    return {}
  } catch (error) {
    return fail(error)
  }
}

export async function lockAvailablePocket(pocketId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin()
    await lockPocket(admin.id, pocketId)
    revalidatePath("/admin/pockets")
    revalidatePath(`/admin/pockets/${pocketId}`)
    return {}
  } catch (error) {
    return fail(error)
  }
}

export async function choosePocket(
  pocketId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const person = await requirePerson()
    await selectPocket({
      personId: person.id,
      pocketId,
      partnerIds: formData.getAll("partnerId").map(String),
    })
  } catch (error) {
    return fail(error)
  }
  revalidatePath("/home")
  revalidatePath("/admin/pockets")
  redirect("/home")
}

export async function decideInvitation(input: {
  decision: "approve" | "decline"
  token?: string
  invitationId?: string
}): Promise<ActionResult> {
  try {
    const person = await requirePerson()
    await respondToInvitation({ ...input, personId: person.id })
  } catch (error) {
    return fail(error)
  }
  revalidatePath("/home")
  revalidatePath("/admin")
  redirect("/home")
}
