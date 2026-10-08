import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MagicLinkSentPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Magic link sent</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Check your email for a secure login link.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
