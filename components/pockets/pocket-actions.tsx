"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { bookAvailablePocket, removePocket } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PocketActions({
  pocketId,
  name,
  occupied,
  canBook,
  returnToList,
}: {
  pocketId: string
  name: string
  occupied: boolean
  canBook: boolean
  returnToList?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function run(action: "delete" | "book") {
    startTransition(async () => {
      const result =
        action === "delete" ? await removePocket(pocketId) : await bookAvailablePocket(pocketId)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success(action === "delete" ? "Pocket deleted." : "Pocket booked.")
      setOpen(false)
      if (action === "delete" && returnToList) router.push("/admin/pockets")
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canBook ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run("book")}>
          Book
        </Button>
      ) : null}
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => run("delete")}>
              {pending ? "Deleting..." : "Delete Pocket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
