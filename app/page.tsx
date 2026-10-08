import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col justify-center gap-8 px-4 py-16 sm:p-6 sm:py-16">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Graduate trainees
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-wider uppercase">Pair Up</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Choose an accommodation pocket and roommates. Access is limited to registered graduate trainees.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trainee</CardTitle>
            <CardDescription>Sign in with the email address registered for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/login" />}>Continue</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Administrator</CardTitle>
            <CardDescription>Manage people, pockets, and allocations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} variant="outline" render={<Link href="/admin/login" />}>
              Admin sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
