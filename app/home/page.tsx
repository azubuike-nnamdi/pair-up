import type { Prisma } from "@prisma/client"
import Link from "next/link"

import { InvitationActions } from "@/components/allocation/invitation-actions"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { requirePerson } from "@/lib/auth/guards"
import { expireStaleSelections, eligiblePockets } from "@/lib/allocation"
import { prisma } from "@/lib/db/prisma"
import { capacityFor, fullName, genderLabel, occupancyLabel, peopleLabel, typeLabel } from "@/lib/domain"

type AvailablePocket = Prisma.PocketGetPayload<Record<string, never>>

export default async function HomePage() {
  await expireStaleSelections()
  const person = await requirePerson()
  const membership = await prisma.membership.findFirst({
    where: { personId: person.id, status: { in: ["PENDING", "APPROVED"] } },
    include: {
      pocket: {
        include: {
          memberships: {
            where: { status: { in: ["PENDING", "APPROVED"] } },
            include: { person: true },
          },
          invitations: {
            where: { status: "PENDING" },
            include: { invitee: true },
          },
        },
      },
    },
  })
  const ownInvitation = await prisma.invitation.findFirst({
    where: {
      inviteeId: person.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: { requester: true, pocket: true },
  })

  if (person.status === "ALLOCATED" && membership) {
    const roommates = membership.pocket.memberships
      .filter((item) => item.personId !== person.id)
      .map((item) => fullName(item.person))
    return (
      <section className="grid gap-3">
        <h1 className="font-heading text-2xl tracking-wider uppercase">Accommodation confirmed</h1>
        <p>Your accommodation has already been confirmed.</p>
        <p>Pocket: {membership.pocket.name}</p>
        <p>Roommates: {roommates.length ? roommates.join(", ") : "None"}</p>
      </section>
    )
  }

  if (person.status === "PENDING" && membership) {
    const waiting = membership.pocket.invitations.map((invitation) => fullName(invitation.invitee))
    return (
      <section className="grid gap-4">
        <h1 className="font-heading text-2xl tracking-wider uppercase">Pending approval</h1>
        {ownInvitation ? (
          <>
            <p>
              {fullName(ownInvitation.requester)} invited you to {ownInvitation.pocket.name}.
            </p>
            <InvitationActions invitationId={ownInvitation.id} />
          </>
        ) : (
          <>
            <p>Your accommodation selection is waiting for approval.</p>
            {waiting.length > 0 ? (
              <div>
                <p>Waiting for:</p>
                <ul className="mt-2 list-disc pl-5">
                  {waiting.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Pocket: {membership.pocket.name}</p>
            )}
          </>
        )}
      </section>
    )
  }

  const pockets: AvailablePocket[] = await eligiblePockets(person.gender)

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="font-heading text-2xl tracking-wider uppercase">
          Available {genderLabel(person.gender)} pockets
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You are eligible for accommodation. Choose an available pocket to continue.
        </p>
      </div>
      {pockets.length === 0 ? (
        <p className="border border-dashed px-4 py-6 text-sm leading-relaxed">
          No accommodation is currently available for you. Please contact the administrator.
        </p>
      ) : (
        <div className="grid gap-3">
          {pockets.map((pocket: AvailablePocket) => (
            <article key={pocket.id} className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">{pocket.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {typeLabel(pocket.type)} · {peopleLabel(capacityFor(pocket.type))} · {occupancyLabel(0, capacityFor(pocket.type))}
                </p>
                <div className="mt-2">
                  <StatusBadge value={pocket.gender} />
                </div>
              </div>
              <Button className="w-full sm:w-auto" nativeButton={false} render={<Link href={`/home/select/${pocket.id}`} />}>Select</Button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
