import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MagicLinkSentPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If this address is registered, a sign-in link is on its way. The link expires in 30 minutes.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
