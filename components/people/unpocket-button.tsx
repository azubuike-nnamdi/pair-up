"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { clearPersonPocket } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function UnpocketButton({
  personId,
  name,
  pocketName,
}: {
  personId: string
  name: string
  pocketName: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function confirm() {
    startTransition(async () => {
      const result = await clearPersonPocket(personId)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success(`${pocketName} is available again.`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Unpocket
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpocket {name}?</DialogTitle>
            <DialogDescription>
              This removes everyone from {pocketName} and makes that pocket available again.
              The pocket is not deleted.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={confirm}>
              {pending ? "Removing..." : "Unpocket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
