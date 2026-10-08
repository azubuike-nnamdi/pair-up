import { cn } from "cn"

import { statusLabel } from "@/lib/domain"

const tones: Record<string, string> = {
  AVAILABLE:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900",
  PENDING:
    "bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900",
  BOOKED:
    "bg-emerald-50 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800",
  ALLOCATED:
    "bg-emerald-50 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800",
  APPROVED:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900",
  MALE: "bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
  FEMALE:
    "bg-violet-50 text-violet-950 ring-violet-200 dark:bg-violet-950 dark:text-violet-100 dark:ring-violet-900",
  DECLINED: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900",
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase ring-1 ring-inset",
        tones[value] ??
          "bg-stone-200 text-stone-800 ring-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700"
      )}
    >
      {statusLabel(value)}
    </span>
  )
}
