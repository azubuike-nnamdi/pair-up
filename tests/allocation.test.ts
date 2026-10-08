import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/domain"
import { memory, resetStore } from "../test/memory-db"

vi.mock("@/lib/db/prisma", async () => {
  const { prisma } = await import("../test/memory-db")
  return { prisma }
})
vi.mock("@/lib/mail/messages", () => ({
  sendInvitationEmail: vi.fn(),
}))

const { selectPocket, eligiblePockets } = await import("@/lib/allocation")
const { bookPocket } = await import("@/lib/pockets")

beforeEach(() => {
  resetStore()
})

function addPerson(input: {
  id: string
  firstName: string
  lastName: string
  email: string
  gender?: "MALE" | "FEMALE"
}) {
  memory().people.push({
    status: "AVAILABLE",
    gender: "MALE",
    ...input,
  })
}

function addPocket(input: {
  id: string
  name: string
  type: "TYPE_1" | "TYPE_2" | "TYPE_3"
  gender?: "MALE" | "FEMALE"
  status?: "AVAILABLE" | "PENDING" | "BOOKED"
}) {
  memory().pockets.push({
    gender: "MALE",
    status: "AVAILABLE",
    deletedAt: null,
    ...input,
  })
}

describe("pocket booking", () => {
  it("books a single-person pocket and takes it off the available list", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_1" })

    await selectPocket({ personId: "ada", pocketId: "pocket-1", partnerIds: [] })

    expect(memory().pockets[0]?.status).toBe("BOOKED")
    expect(memory().people[0]?.status).toBe("ALLOCATED")
    await expect(eligiblePockets("MALE")).resolves.toEqual([])
  })

  it("keeps a shared pocket pending until the seats are approved", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPerson({ id: "grace", firstName: "Grace", lastName: "Hopper", email: "grace@example.com" })
    addPocket({ id: "pocket-2", name: "Block A - M2", type: "TYPE_2" })

    await selectPocket({ personId: "ada", pocketId: "pocket-2", partnerIds: ["grace"] })

    expect(memory().pockets[0]?.status).toBe("PENDING")
    expect(memory().people.map((person) => person.status)).toEqual(["PENDING", "PENDING"])
    await expect(eligiblePockets("MALE")).resolves.toEqual([])
  })

  it("rejects a booked pocket", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_1", status: "BOOKED" })

    await expect(
      selectPocket({ personId: "ada", pocketId: "pocket-1", partnerIds: [] })
    ).rejects.toThrow(new AppError("This pocket is no longer available."))
    expect(memory().pockets[0]?.status).toBe("BOOKED")
    expect(memory().memberships).toHaveLength(0)
  })

  it("marks a full pocket booked so it cannot be selected", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPerson({ id: "grace", firstName: "Grace", lastName: "Hopper", email: "grace@example.com" })
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_1" })
    memory().memberships.push({
      id: "existing",
      personId: "grace",
      pocketId: "pocket-1",
      role: "INITIATOR",
      status: "APPROVED",
      activePersonKey: "grace",
    })

    await expect(
      selectPocket({ personId: "ada", pocketId: "pocket-1", partnerIds: [] })
    ).rejects.toThrow(new AppError("This pocket is no longer available."))
    expect(memory().pockets[0]?.status).toBe("BOOKED")
  })

  it("hides an available pocket that already has every seat taken", async () => {
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_1" })
    memory().memberships.push({
      id: "existing",
      personId: "grace",
      pocketId: "pocket-1",
      role: "INITIATOR",
      status: "APPROVED",
      activePersonKey: "grace",
    })

    await expect(eligiblePockets("MALE")).resolves.toEqual([])
  })

  it("lets an admin book an available pocket and refuses a second booking", async () => {
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_1" })

    await bookPocket("admin-1", "pocket-1")

    expect(memory().pockets[0]?.status).toBe("BOOKED")
    await expect(bookPocket("admin-1", "pocket-1")).rejects.toThrow(
      new AppError("Only an available pocket can be booked.")
    )
  })
})
