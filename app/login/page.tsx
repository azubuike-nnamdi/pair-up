import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePerson } from "@/lib/auth/guards"
import { getSession } from "@/lib/auth/session"
import { safeNextPath } from "@/lib/domain"

function signedInDestination(next: string | undefined) {
  const path = safeNextPath(next)
  if (path === "/login" || path.startsWith("/login/") || path.startsWith("/auth/end")) {
    return "/home"
  }
  return path
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const session = await getSession()
  if (session?.role === "person") {
    let destination: string | undefined
    let expired = false
    try {
      await requirePerson()
      destination = signedInDestination(params.next)
    } catch {
      expired = true
    }
    if (expired) redirect("/auth/end")
    if (destination) redirect(destination)
  }

  const next = params.next ? safeNextPath(params.next) : undefined

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Pair Up</p>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter the email address registered for your graduate trainee place.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} expired={params.error === "expired"} />
        </CardContent>
      </Card>
    </main>
  )
}
