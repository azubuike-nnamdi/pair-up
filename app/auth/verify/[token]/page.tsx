import { redirect } from "next/navigation"

import { confirmMagicLink } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { hashToken } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { safeNextPath } from "@/lib/domain"

export default async function VerifyMagicLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { token } = await params
  const next = safeNextPath((await searchParams).next)
  const link = await prisma.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  })
  if (!link || link.usedAt || link.expiresAt < new Date()) {
    redirect("/login?error=expired")
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Pair Up</p>
          <CardTitle>Finish signing in</CardTitle>
          <CardDescription>
            Press Continue to open your accommodation. This link can only be used once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={confirmMagicLink}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="next" value={next} />
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
