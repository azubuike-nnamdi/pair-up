import bcrypt from "bcryptjs"

import { prisma } from "../lib/db/prisma"

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.")
  }

  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    return
  }

  await prisma.admin.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
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
