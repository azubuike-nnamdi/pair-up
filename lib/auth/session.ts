import { createHash, randomBytes } from "node:crypto"

import { cookies } from "next/headers"

import { signSession, verifySession, SESSION_COOKIE, type SessionInput } from "@/lib/auth/session-token"

const SESSION_SECONDS = 60 * 60 * 12

export async function setSession(session: SessionInput) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await signSession(session, SESSION_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getSession() {
  const jar = await cookies()
  return verifySession(jar.get(SESSION_COOKIE)?.value)
}

export function createToken() {
  return randomBytes(32).toString("base64url")
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}
