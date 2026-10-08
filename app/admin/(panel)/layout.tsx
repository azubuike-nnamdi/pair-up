import { redirect } from "next/navigation"

import { AdminShell } from "@/components/shell"
import { requireAdmin } from "@/lib/auth/guards"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch {
    redirect("/auth/end?next=/admin/login")
  }
  return <AdminShell>{children}</AdminShell>
}
