import { redirect } from "next/navigation"

import { clearSession } from "@/lib/auth/session"

export async function GET(request: Request) {
  await clearSession()
  const next = new URL(request.url).searchParams.get("next")
  redirect(next === "/admin/login" ? "/admin/login" : "/login")
}
