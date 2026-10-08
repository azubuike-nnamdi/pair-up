"use client"

import { useActionState } from "react"

import { requestMagicLink, type ActionResult } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LoginForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    requestMagicLink,
    null
  )

  return (
    <form action={action} className="grid gap-4">
      {expired ? (
        <Alert variant="destructive">
          <AlertTitle>This sign-in link is invalid or has expired.</AlertTitle>
          <AlertDescription>Request a new link with your email address.</AlertDescription>
        </Alert>
      ) : null}
      {state?.title ? (
        <Alert variant="destructive">
          <AlertTitle>{state.title}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Continue"}
      </Button>
    </form>
  )
}
