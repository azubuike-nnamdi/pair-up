import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/components/auth/login-form"
import { safeNextPath } from "@/lib/domain"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
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
