"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "cn"

const PAGE_SIZES = [10, 25, 50]

export function PocketPagination({
  page,
  rows,
  total,
  filter,
}: {
  page: number
  rows: number
  total: number
  filter: string
}) {
  const router = useRouter()
  const pageCount = Math.max(1, Math.ceil(total / rows))
  const start = total === 0 ? 0 : (page - 1) * rows + 1
  const end = Math.min(page * rows, total)

  function href(nextPage: number, nextRows = rows) {
    const params = new URLSearchParams()
    if (filter !== "all") params.set("filter", filter)
    if (nextRows !== 10) params.set("rows", String(nextRows))
    if (nextPage > 1) params.set("page", String(nextPage))
    const query = params.toString()
    return query ? `/admin/pockets?${query}` : "/admin/pockets"
  }

  return (
    <div className="mt-4 grid gap-3 rounded-lg border px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <p className="text-sm text-muted-foreground">
        {start}–{end} of {total}
      </p>
      <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
        <PageLink href={href(page - 1)} label="Previous page" disabled={page <= 1}>
          <ChevronLeftIcon className="size-4" />
        </PageLink>
        {pageItems(page, pageCount).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={href(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full text-sm",
                item === page
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {item}
            </Link>
          )
        )}
        <PageLink href={href(page + 1)} label="Next page" disabled={page >= pageCount}>
          <ChevronRightIcon className="size-4" />
        </PageLink>
      </nav>
      <label className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
        Rows
        <select
          aria-label="Rows per page"
          className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          value={rows}
          onChange={(event) => router.push(href(1, Number(event.target.value)))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function PageLink({
  href,
  label,
  disabled,
  children,
}: {
  href: string
  label: string
  disabled: boolean
  children: ReactNode
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="inline-flex size-8 items-center justify-center text-muted-foreground opacity-40">
        {children}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={label} className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
      {children}
    </Link>
  )
}

function pageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total]
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total]
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total]
}
