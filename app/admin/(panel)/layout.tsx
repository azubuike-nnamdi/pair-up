import { redirect } from "next/navigation"

import { AdminShell } from "@/components/shell"
import { requireAdmin } from "@/lib/auth/guards"
import { clearSession } from "@/lib/auth/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch {
    await clearSession()
    redirect("/admin/login")
  }
  return <AdminShell>{children}</AdminShell>
}
