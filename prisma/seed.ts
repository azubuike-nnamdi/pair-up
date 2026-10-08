import bcrypt from "bcryptjs"

import { prisma } from "../lib/db/prisma"

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.")
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    const samePassword = await bcrypt.compare(password, existing.passwordHash)
    if (samePassword) return
    await prisma.admin.update({
      where: { id: existing.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    })
    return
  }

  await prisma.admin.create({
    data: {
      email,
      passwordHash,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed")
    await prisma.$disconnect()
    process.exit(1)
  })
