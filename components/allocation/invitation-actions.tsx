"use client"

import { useState, useTransition } from "react"

import { decideInvitation } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"

export function InvitationActions({
  token,
  invitationId,
}: {
  token?: string
  invitationId?: string
}) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function respond(decision: "approve" | "decline") {
    startTransition(async () => {
      const result = await decideInvitation({ decision, token, invitationId })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => respond("approve")}>
          Approve
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => respond("decline")}>
          Decline
        </Button>
      </div>
    </div>
  )
}
