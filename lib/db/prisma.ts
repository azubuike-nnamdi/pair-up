import { setDefaultResultOrder } from "node:dns"

import { Prisma, PrismaClient } from "@prisma/client"

setDefaultResultOrder("ipv4first")

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function runtimeDatabaseUrl() {
  // Row locks and multi-statement transactions need Neon's direct connection.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }

  const parsed = new URL(url)
  parsed.searchParams.set("connection_limit", "5")
  return parsed.toString()
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect()
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

globalForPrisma.prisma = prisma

export type Db = PrismaClient | Prisma.TransactionClient
