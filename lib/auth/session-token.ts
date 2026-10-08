const COOKIE = "pairup_session"
const encoder = new TextEncoder()

export const SESSION_COOKIE = COOKIE

export type Session =
  | { role: "admin"; adminId: string; sessionVersion: number; exp: number }
  | { role: "person"; personId: string; exp: number }

export type SessionInput =
  | { role: "admin"; adminId: string; sessionVersion: number }
  | { role: "person"; personId: string }

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value) {
    throw new Error("AUTH_SECRET is not set")
  }
  return value
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signature))
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

export async function signSession(session: SessionInput, maxAgeSeconds: number) {
  const payload: Session =
    session.role === "admin"
      ? {
          role: "admin",
          adminId: session.adminId,
          sessionVersion: session.sessionVersion,
          exp: Date.now() + maxAgeSeconds * 1000,
        }
      : {
          role: "person",
          personId: session.personId,
          exp: Date.now() + maxAgeSeconds * 1000,
        }
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
  return `${body}.${await hmac(body)}`
}

export async function verifySession(token: string | undefined | null) {
  if (!token) return null
  const [body, signature, extra] = token.split(".")
  if (!body || !signature || extra) return null
  const expected = await hmac(body)
  if (!safeEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as Session
    if (!parsed || typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null
    }
    if (
      parsed.role === "admin" &&
      typeof parsed.adminId === "string" &&
      typeof parsed.sessionVersion === "number"
    ) {
      return parsed
    }
    if (parsed.role === "person" && typeof parsed.personId === "string") {
      return parsed
    }
  } catch {
    return null
  }
  return null
}
