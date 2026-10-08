import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl tracking-wider uppercase">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function FilterLinks({
  base,
  current,
  query,
  options,
}: {
  base: string
  current: string
  query?: string
  options: Array<[string, string]>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => {
        const params = new URLSearchParams()
        if (value !== "all") params.set("filter", value)
        if (query) params.set("q", query)
        const href = params.size ? `${base}?${params}` : base
        const active = current === value
        return (
          <Link
            key={value}
            href={href}
            className={
              active
                ? "bg-foreground px-3 py-1.5 text-xs font-semibold tracking-widest text-background uppercase"
                : "px-3 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase ring-1 ring-border"
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-vertical:h-4" />
          <p className="min-w-0 truncate text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Administration
          </p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function UserShell({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/home" className="font-heading text-lg tracking-wider uppercase">
            Pair Up
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="max-w-40 truncate text-sm text-muted-foreground sm:max-w-none">{name}</span>
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}
