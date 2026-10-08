import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { PartnerPicker } from "@/components/allocation/partner-picker"
import { requirePerson } from "@/lib/auth/guards"
import { eligiblePartners } from "@/lib/allocation"
import { prisma } from "@/lib/db/prisma"
import { capacityFor, partnersRequired, peopleLabel, typeLabel } from "@/lib/domain"

export default async function SelectPocketPage({
  params,
}: {
  params: Promise<{ pocketId: string }>
}) {
  const { pocketId } = await params
  const person = await requirePerson()
  if (person.status !== "AVAILABLE") redirect("/home")

  const pocket = await prisma.pocket.findFirst({
    where: {
      id: pocketId,
      deletedAt: null,
      status: "AVAILABLE",
      gender: person.gender,
    },
  })
  if (!pocket) notFound()

  const partners = await eligiblePartners(person.id, person.gender)
  const required = partnersRequired(pocket.type)

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          <Link href="/home">Available pockets</Link>
        </p>
        <h1 className="mt-2 font-heading text-2xl tracking-wider uppercase">{pocket.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {typeLabel(pocket.type)} · {peopleLabel(capacityFor(pocket.type))}
        </p>
      </div>
      <PartnerPicker pocketId={pocket.id} required={required} partners={partners} />
    </section>
  )
}
