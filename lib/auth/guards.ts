import { headers } from "next/headers"

import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/domain"

export async function requireAdmin() {
  const session = await getSession()
  if (session?.role !== "admin") {
    throw new AppError("Unauthorized")
  }
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } })
  if (!admin) {
    throw new AppError("Unauthorized")
  }
  return admin
}

export async function requirePerson() {
  const session = await getSession()
  if (session?.role !== "person") {
    throw new AppError("Unauthorized")
  }
  const person = await prisma.person.findUnique({ where: { id: session.personId } })
  if (!person) {
    throw new AppError("Unauthorized")
  }
  return person
}

export async function requestIp() {
  const headerList = await headers()
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "local"
  )
}
