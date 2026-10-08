"use client"

import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { addPerson } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function AddPersonDialog() {
  const [open, setOpen] = useState(false)
  const [gender, setGender] = useState("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set("gender", gender)
    startTransition(async () => {
      const result = await addPerson(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success("Graduate trainee added. A welcome email was sent.")
      setOpen(false)
      setGender("")
      setError(undefined)
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Graduate Trainee</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Graduate Trainee</DialogTitle>
            <DialogDescription>
              A welcome email is sent to this address. They request a sign-in link when they are ready to log in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input id="phoneNumber" name="phoneNumber" required />
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={(value) => setGender(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !gender}>
                {pending ? "Adding..." : "Add Person"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
