import { redirect } from "next/navigation"

import { AdminLoginForm } from "@/components/auth/admin-login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdmin } from "@/lib/auth/guards"
import { getSession } from "@/lib/auth/session"

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session?.role === "admin") {
    let signedIn = false
    let expired = false
    try {
      await requireAdmin()
      signedIn = true
    } catch {
      expired = true
    }
    if (expired) redirect("/auth/end?next=/admin/login")
    if (signedIn) redirect("/admin")
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Pair Up</p>
          <CardTitle>Administrator</CardTitle>
          <CardDescription>Sign in to manage accommodation.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
