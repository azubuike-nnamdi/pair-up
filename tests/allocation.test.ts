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
const { assignPeople, unpocketPerson, updatePocketName } = await import("@/lib/pockets")

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

  it("assigns an unpaired person of the same gender and books a full pocket", async () => {
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_2" })
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPerson({
      id: "grace",
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    })
    addPerson({
      id: "ada-f",
      firstName: "Ada",
      lastName: "King",
      email: "king@example.com",
      gender: "FEMALE",
    })

    await assignPeople("admin-1", "pocket-1", ["ada"])

    expect(memory().pockets[0]?.status).toBe("PENDING")
    expect(memory().people.find((person) => person.id === "ada")?.status).toBe("ALLOCATED")
    await expect(assignPeople("admin-1", "pocket-1", ["ada-f"])).rejects.toThrow(
      new AppError("One of the selected people is not eligible.")
    )

    await assignPeople("admin-1", "pocket-1", ["grace"])

    expect(memory().pockets[0]?.status).toBe("BOOKED")
    await expect(assignPeople("admin-1", "pocket-1", ["ada"])).rejects.toThrow(
      new AppError("This pocket is already full.")
    )
  })
})

describe("unpocket", () => {
  it("releases everyone in a pending pocket and keeps the pocket", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPerson({ id: "grace", firstName: "Grace", lastName: "Hopper", email: "grace@example.com" })
    addPocket({ id: "pocket-2", name: "Block A - M2", type: "TYPE_2" })

    await selectPocket({ personId: "ada", pocketId: "pocket-2", partnerIds: ["grace"] })
    await unpocketPerson("admin-1", "ada")

    expect(memory().pockets[0]).toMatchObject({ status: "AVAILABLE", deletedAt: null })
    expect(memory().people.map((person) => person.status)).toEqual(["AVAILABLE", "AVAILABLE"])
    expect(memory().memberships.every((membership) => membership.status === "RELEASED")).toBe(true)
    expect(memory().invitations.every((invitation) => invitation.status === "EXPIRED")).toBe(true)
    expect(memory().audits.at(-1)).toMatchObject({
      action: "POCKET_RELEASED",
      summary: "Released 2 occupants from Block A - M2",
    })
    await expect(eligiblePockets("MALE")).resolves.toHaveLength(1)
  })

  it("releases everyone in a booked pocket and keeps the pocket", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
    addPerson({ id: "grace", firstName: "Grace", lastName: "Hopper", email: "grace@example.com" })
    addPocket({ id: "pocket-2", name: "Block A - M2", type: "TYPE_2", status: "BOOKED" })
    for (const person of memory().people) person.status = "ALLOCATED"
    memory().memberships.push(
      {
        id: "ada-seat",
        personId: "ada",
        pocketId: "pocket-2",
        role: "INITIATOR",
        status: "APPROVED",
        activePersonKey: "ada",
      },
      {
        id: "grace-seat",
        personId: "grace",
        pocketId: "pocket-2",
        role: "PARTNER",
        status: "APPROVED",
        activePersonKey: "grace",
      }
    )

    await unpocketPerson("admin-1", "grace")

    expect(memory().pockets[0]).toMatchObject({ name: "Block A - M2", status: "AVAILABLE", deletedAt: null })
    expect(memory().people.map((person) => person.status)).toEqual(["AVAILABLE", "AVAILABLE"])
    expect(memory().memberships.every((membership) => membership.status === "RELEASED")).toBe(true)
    await expect(eligiblePockets("MALE")).resolves.toHaveLength(1)
  })

  it("rejects a person who is not in a pocket", async () => {
    addPerson({ id: "ada", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })

    await expect(unpocketPerson("admin-1", "ada")).rejects.toThrow(
      new AppError("This graduate trainee is not in a pocket.")
    )
  })
})

describe("pocket names", () => {
  it("renames a pocket and records the previous name", async () => {
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_2" })

    await updatePocketName("admin-1", "pocket-1", "  Block A - M2  ")

    expect(memory().pockets[0]?.name).toBe("Block A - M2")
    expect(memory().audits[0]).toMatchObject({
      action: "POCKET_RENAMED",
      summary: "Renamed Block A - M1 to Block A - M2",
    })
  })

  it("rejects a pocket name that is too short", async () => {
    addPocket({ id: "pocket-1", name: "Block A - M1", type: "TYPE_2" })

    await expect(updatePocketName("admin-1", "pocket-1", " A ")).rejects.toThrow(
      new AppError("Enter a pocket name.")
    )
  })
})
