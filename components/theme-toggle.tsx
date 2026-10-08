"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useIsClient()
  const dark = mounted && resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export function PublicThemeToggle() {
  const pathname = usePathname()
  const inAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login"
  const inHome = pathname.startsWith("/home")

  if (inAdmin || inHome) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  )
}
