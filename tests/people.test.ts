import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError, personSchema } from "@/lib/domain"
import { memory, resetStore } from "../test/memory-db"

vi.mock("@/lib/db/prisma", async () => {
  const { prisma } = await import("../test/memory-db")
  return { prisma }
})

const { previewPeopleImport } = await import("@/lib/people")

beforeEach(() => {
  resetStore()
})

describe("graduate trainees", () => {
  it("accepts a trainee without a phone number", () => {
    const parsed = personSchema.parse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      gender: "FEMALE",
    })

    expect(parsed).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      gender: "FEMALE",
    })
    expect(parsed).not.toHaveProperty("phoneNumber")
  })

  it("imports a CSV of name, email, and gender", async () => {
    const preview = await previewPeopleImport(
      ["firstName,lastName,email,gender", "Ada,Lovelace,ada@example.com,female"].join("\n")
    )

    expect(preview.valid).toEqual([
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        gender: "FEMALE",
      },
    ])
    expect(preview.invalid).toEqual([])
  })

  it("rejects a CSV that still includes a phone number column", async () => {
    await expect(
      previewPeopleImport(
        "firstName,lastName,email,phoneNumber,gender\nAda,Lovelace,ada@example.com,0803,female"
      )
    ).rejects.toThrow(new AppError("CSV headers must be firstName,lastName,email,gender."))
  })

  it("skips an email that is already registered", async () => {
    memory().people.push({
      id: "ada",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      gender: "FEMALE",
      status: "AVAILABLE",
    })

    const preview = await previewPeopleImport(
      ["firstName,lastName,email,gender", "Ada,Lovelace,ada@example.com,female"].join("\n")
    )

    expect(preview.valid).toEqual([])
    expect(preview.duplicateEmails).toEqual(["ada@example.com"])
  })
})
