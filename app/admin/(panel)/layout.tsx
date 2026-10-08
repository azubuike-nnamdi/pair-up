import { redirect } from "next/navigation"

import { AdminShell } from "@/components/shell"
import { getSession } from "@/lib/auth/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (session?.role !== "admin") redirect("/admin/login")
  return <AdminShell>{children}</AdminShell>
}
