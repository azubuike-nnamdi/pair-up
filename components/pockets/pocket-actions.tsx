"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { assignPocketPeople, listUnpairedPeople, removePocket } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Candidate = { id: string; firstName: string; lastName: string; email: string }

export function PocketActions({
  pocketId,
  name,
  occupied,
  canAssign,
  seats,
  gender,
  returnToList,
}: {
  pocketId: string
  name: string
  occupied: boolean
  canAssign: boolean
  seats: number
  gender: "MALE" | "FEMALE"
  returnToList?: boolean
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [people, setPeople] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const genderLabel = gender === "MALE" ? "male" : "female"
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return people
    return people.filter((person) =>
      `${person.firstName} ${person.lastName} ${person.email}`.toLowerCase().includes(needle)
    )
  }, [people, query])

  async function openAssign() {
    setAssignOpen(true)
    setError(undefined)
    setSelected([])
    setQuery("")
    setLoading(true)
    const result = await listUnpairedPeople(pocketId)
    setPeople(result.people)
    setError(result.error)
    setLoading(false)
  }

  function runDelete() {
    startTransition(async () => {
      const result = await removePocket(pocketId)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success("Pocket deleted.")
      setDeleteOpen(false)
      if (returnToList) router.push("/admin/pockets")
      else router.refresh()
    })
  }

  function runAssign() {
    startTransition(async () => {
      const result = await assignPocketPeople(pocketId, selected)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success("People assigned.")
      setAssignOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canAssign ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={openAssign}>
          Assign
        </Button>
      ) : null}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setError(undefined)
          setDeleteOpen(true)
        }}
      >
        Delete
      </Button>
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to {name}</DialogTitle>
            <DialogDescription>
              Choose up to {seats} unpaired {genderLabel} {seats === 1 ? "trainee" : "trainees"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
          />
          <div className="grid max-h-64 gap-2 overflow-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading people...</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No unpaired {genderLabel} trainees match.
              </p>
            ) : (
              visible.map((person) => {
                const checked = selected.includes(person.id)
                return (
                  <label key={person.id} className="flex items-start gap-3 border px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      disabled={!checked && selected.length >= seats}
                      onCheckedChange={(value) => {
                        setSelected((current) =>
                          value
                            ? [...current, person.id].slice(0, seats)
                            : current.filter((id) => id !== person.id)
                        )
                      }}
                    />
                    <span>
                      <span className="block">
                        {person.firstName} {person.lastName}
                      </span>
                      <span className="text-muted-foreground">{person.email}</span>
                    </span>
                  </label>
                )
              })
            )}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || selected.length === 0} onClick={runAssign}>
              {pending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pocket?</DialogTitle>
            <DialogDescription>
              {occupied
                ? "This pocket is currently assigned to one or more graduate trainees. Deleting it will release all occupants and make them eligible for another accommodation selection."
                : `${name} will be removed from the available accommodation list.`}
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={runDelete}>
              {pending ? "Deleting..." : "Delete Pocket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
