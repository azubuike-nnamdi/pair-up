import { redirect } from "next/navigation"

import { hashToken, setSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { safeNextPath } from "@/lib/domain"

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const next = safeNextPath(new URL(request.url).searchParams.get("next"))
  const tokenHash = hashToken(token)
  const updated = await prisma.magicLink.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (updated.count !== 1) redirect("/login?error=expired")

  const link = await prisma.magicLink.findUnique({
    where: { tokenHash },
    select: { personId: true },
  })
  if (!link) redirect("/login?error=expired")

  await setSession({ role: "person", personId: link.personId })
  redirect(next)
}
