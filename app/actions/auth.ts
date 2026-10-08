"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requestIp } from "@/lib/auth/guards"
import { clearSession, createToken, hashToken, setSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AppError, UNAUTHORIZED_BODY, UNAUTHORIZED_TITLE, appUrl, safeNextPath } from "@/lib/domain"
import { sendMagicLinkEmail } from "@/lib/mail/messages"

export type ActionResult = { error?: string; title?: string } | null

export async function requestMagicLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase())
  if (!parsed.success) {
    return { error: "Enter a valid email address." }
  }

  const ip = await requestIp()
  const since = new Date(Date.now() - 15 * 60 * 1000)
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })
  const attempts = await prisma.loginAttempt.count({
    where: { ip, createdAt: { gt: since } },
  })
  if (attempts >= 100) {
    return { error: "Too many attempts. Please wait a few minutes and try again." }
  }
  await prisma.loginAttempt.create({ data: { ip } })

  const person = await prisma.person.findUnique({ where: { email: parsed.data } })
  if (!person) {
    return { title: UNAUTHORIZED_TITLE, error: UNAUTHORIZED_BODY }
  }

  const recentLinks = await prisma.magicLink.count({
    where: { personId: person.id, createdAt: { gt: since }, usedAt: null },
  })
  if (recentLinks >= 5) {
    return {
      error: "A sign-in link was just sent. Check your email or wait a few minutes.",
    }
  }

  await prisma.magicLink.updateMany({
    where: { personId: person.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = createToken()
  const link = await prisma.magicLink.create({
    data: {
      personId: person.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })

  const url = new URL(`/auth/verify/${token}`, appUrl())
  const next = safeNextPath(formData.get("next"))
  if (next !== "/home") url.searchParams.set("next", next)

  try {
    await sendMagicLinkEmail({
      to: person.email,
      firstName: person.firstName,
      url: url.toString(),
    })
  } catch (error) {
    await prisma.magicLink.delete({ where: { id: link.id } })
    if (error instanceof AppError) return { error: error.message }
    return { error: "We could not send the sign-in email. Please try again." }
  }

  redirect("/login/sent")
}

export async function adminLogin(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const admin = email ? await prisma.admin.findUnique({ where: { email } }) : null
  const matches = admin ? await bcrypt.compare(password, admin.passwordHash) : false
  if (!admin || !matches) {
    return { error: "Invalid email or password." }
  }
  await setSession({ role: "admin", adminId: admin.id })
  redirect("/admin")
}

export async function logout() {
  await clearSession()
  redirect("/")
}
