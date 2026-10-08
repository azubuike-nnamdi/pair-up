import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminLoginForm } from "@/components/auth/admin-login-form"

export default function AdminLoginPage() {
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
