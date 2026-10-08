import type { Metadata } from "next"
import { Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google"

import { PublicThemeToggle } from "@/components/theme-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { appUrl } from "@/lib/domain"
import { cn } from "@/lib/utils"
import "./globals.css"

const description =
  "Graduate trainee accommodation allocation. Choose a pocket and roommates. Access is limited to registered graduate trainees."

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Pair Up",
    template: "%s | Pair Up",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "Pair Up",
    title: "Pair Up | Graduate trainee accommodation",
    description,
  },
  twitter: {
    card: "summary",
    title: "Pair Up",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const playfairDisplayHeading = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' });

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <PublicThemeToggle />
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
