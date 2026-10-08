import Link from "next/link"
import { notFound } from "next/navigation"

import { PartnerPicker } from "@/components/allocation/partner-picker"
import { Button } from "@/components/ui/button"
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
  if (person.status !== "AVAILABLE") {
    return (
      <section className="grid gap-4">
        <h1 className="font-heading text-2xl tracking-wider uppercase">Selection closed</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You already have an accommodation selection.
        </p>
        <Button className="w-fit" nativeButton={false} render={<Link href="/home" />}>
          Go to your accommodation
        </Button>
      </section>
    )
  }

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
