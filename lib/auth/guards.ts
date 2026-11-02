import { headers } from "next/headers"

import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AppError, appUrl } from "@/lib/domain"

export function readSessionVersion(row: object) {
  if ("sessionVersion" in row && typeof row.sessionVersion === "number") {
    return row.sessionVersion
  }
  return null
}

export async function requireAdmin() {
  const session = await getSession()
  if (session?.role !== "admin") {
    throw new AppError("Unauthorized")
  }
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } })
  if (!admin || readSessionVersion(admin) !== session.sessionVersion) {
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

export async function requestOrigin() {
  const configured = appUrl()
  const local = configured.includes("localhost") || configured.includes("127.0.0.1")
  if (!local) return configured
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  if (!host) return configured
  const proto = headerList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function requestIp() {
  const headerList = await headers()
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "local"
  )
}
