import { redirect } from "next/navigation"

import { UserShell } from "@/components/shell"
import { requirePerson } from "@/lib/auth/guards"
import { fullName } from "@/lib/domain"

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  let person
  try {
    person = await requirePerson()
  } catch {
    redirect("/auth/end")
  }
  return <UserShell name={fullName(person)}>{children}</UserShell>
}
