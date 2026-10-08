"use client"

import { useActionState, useMemo, useState } from "react"

import { choosePocket } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export function PartnerPicker({
  pocketId,
  required,
  partners,
}: {
  pocketId: string
  required: number
  partners: Array<{ id: string; firstName: string; lastName: string; email: string }>
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [state, action, pending] = useActionState(choosePocket.bind(null, pocketId), null)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return partners
    return partners.filter((person) =>
      `${person.firstName} ${person.lastName} ${person.email}`.toLowerCase().includes(needle)
    )
  }, [partners, query])

  return (
    <form action={action} className="grid gap-4">
      {required === 0 ? (
        <p className="text-sm leading-relaxed">
          This is a single-person accommodation. No partner is required.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed">
            Select {required} {required === 1 ? "person" : "people"} to join your pocket.
          </p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
          />
          <div className="grid max-h-96 gap-2 overflow-auto">
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible people match this search.</p>
            ) : (
              visible.map((person) => {
                const checked = selected.includes(person.id)
                return (
                  <label key={person.id} className="flex items-start gap-3 border px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      disabled={!checked && selected.length >= required}
                      onCheckedChange={(value) => {
                        setSelected((current) =>
                          value
                            ? [...current, person.id].slice(0, required)
                            : current.filter((id) => id !== person.id)
                        )
                      }}
                    />
                    <span>
                      <span className="block">{person.firstName} {person.lastName}</span>
                      <span className="text-muted-foreground">{person.email}</span>
                    </span>
                  </label>
                )
              })
            )}
          </div>
          {selected.map((id) => (
            <input key={id} type="hidden" name="partnerId" value={id} />
          ))}
        </>
      )}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending || selected.length !== required}>
        {pending ? "Saving..." : required === 0 ? "Confirm accommodation" : "Send approval requests"}
      </Button>
    </form>
  )
}
