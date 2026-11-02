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

const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"])

function isTransientDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_CODES.has(error.code)
  ) {
    return true
  }
  const message = error instanceof Error ? error.message : ""
  return (
    message.includes("Can't reach database") ||
    message.includes("terminating connection") ||
    message.includes("E57P01") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection reset")
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createPrismaClient() {
  const client = new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let last: unknown
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              return await query(args)
            } catch (error) {
              last = error
              if (!isTransientDatabaseError(error) || attempt === 2) throw error
              await client.$disconnect()
              await wait(300 * (attempt + 1))
            }
          }
          throw last
        },
      },
    },
  }) as unknown as PrismaClient
}

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect()
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

globalForPrisma.prisma = prisma

export type Db = PrismaClient | Prisma.TransactionClient
