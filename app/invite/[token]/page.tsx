import Link from "next/link"

import { InvitationActions } from "@/components/allocation/invitation-actions"
import { Button } from "@/components/ui/button"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { fullName, typeLabel } from "@/lib/domain"
import { hashToken } from "@/lib/auth/session"

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { pocket: true, requester: true, invitee: true },
  })
  const session = await getSession()

  if (!session || session.role !== "person") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-4 px-4 py-16 sm:p-6">
        <h1 className="font-heading text-2xl tracking-wider uppercase">Sign in to respond</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use the email address that received this invitation.
        </p>
        <Button nativeButton={false} render={<Link href={`/login?next=/invite/${token}`} />}>Continue</Button>
      </main>
    )
  }

  if (
    !invitation ||
    invitation.inviteeId !== session.personId ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt < new Date()
  ) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-3 px-4 py-16 sm:p-6">
        <h1 className="font-heading text-2xl tracking-wider uppercase">Invitation unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This invitation is no longer active, or it was sent to someone else.
        </p>
        <Button nativeButton={false} variant="outline" render={<Link href="/home" />}>
          Go to your accommodation
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-4 px-4 py-16 sm:p-6">
      <h1 className="font-heading text-2xl tracking-wider uppercase">Approval request</h1>
      <p className="text-sm leading-relaxed">
        {fullName(invitation.requester)} selected you for {invitation.pocket.name} (
        {typeLabel(invitation.pocket.type)}).
      </p>
      <InvitationActions token={token} />
    </main>
  )
}
