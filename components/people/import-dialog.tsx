"use client"

import { useState, useTransition, type ChangeEvent } from "react"
import { toast } from "sonner"

import { commitPeopleImport, reviewPeopleCsv } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ImportPreview } from "@/lib/people"

export function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPreview>()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPreview(undefined)
    setError(undefined)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      startTransition(async () => {
        const result = await reviewPeopleCsv(String(reader.result ?? ""))
        if (result && "preview" in result && result.preview) {
          setPreview(result.preview)
          return
        }
        setError(result && "error" in result ? result.error : "Could not read the file.")
      })
    }
    reader.readAsText(file)
  }

  function commit() {
    if (!preview) return
    startTransition(async () => {
      const result = await commitPeopleImport(preview.valid)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success(
        `${result?.title ?? preview.valid.length} graduate trainees imported. Welcome emails were sent.`
      )
      setOpen(false)
      setPreview(undefined)
    })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import graduate trainees</DialogTitle>
            <DialogDescription>
              CSV columns: firstName, lastName, email, gender. Each new person receives a welcome email.
            </DialogDescription>
          </DialogHeader>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="text-sm"
          />
          {preview ? (
            <div className="grid gap-2 text-sm">
              <p>{preview.total} records found</p>
              <p>{preview.valid.length} valid</p>
              <p>{preview.duplicateEmails.length} duplicate emails</p>
              <p>{preview.invalid.length} invalid records</p>
              {preview.invalid.slice(0, 5).map((row) => (
                <p key={`${row.row}-${row.message}`} className="text-destructive">
                  Row {row.row}: {row.message}
                </p>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !preview || preview.valid.length === 0}
              onClick={commit}
            >
              {pending ? "Importing..." : `Import ${preview?.valid.length ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
