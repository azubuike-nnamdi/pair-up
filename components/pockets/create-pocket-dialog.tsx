"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { addBulkPockets, addPocket, previewBulk } from "@/app/actions/admin"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  distributionTotal,
  genderLabel,
  typeLabel,
  type PocketDistribution,
} from "@/lib/domain"

const emptyGroup = { type1: 0, type2: 0, type3: 0 }

type Step = "mode" | "single" | "count" | "distribution" | "preview"
type Sample = {
  total: number
  sample: Array<{ name: string; gender: "MALE" | "FEMALE"; type: "TYPE_1" | "TYPE_2" | "TYPE_3"; capacity: number }>
  remaining: number
}

export function CreatePocketDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("mode")
  const [mode, setMode] = useState("single")
  const [name, setName] = useState("")
  const [type, setType] = useState("TYPE_2")
  const [gender, setGender] = useState("MALE")
  const [total, setTotal] = useState(100)
  const [prefix, setPrefix] = useState("GT 2026")
  const [distribution, setDistribution] = useState<PocketDistribution>({
    male: { ...emptyGroup },
    female: { ...emptyGroup },
  })
  const [sample, setSample] = useState<Sample>()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const configured = distributionTotal(distribution)
  const balanced = configured === total && total > 0

  function reset() {
    setStep("mode")
    setError(undefined)
    setSample(undefined)
  }

  function setCount(
    group: "male" | "female",
    key: "type1" | "type2" | "type3",
    value: string
  ) {
    const next = Math.max(0, Math.trunc(Number(value) || 0))
    setDistribution((current) => ({
      ...current,
      [group]: { ...current[group], [key]: next },
    }))
  }

  function createSingle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set("name", name)
    formData.set("type", type)
    formData.set("gender", gender)
    startTransition(async () => {
      const result = await addPocket(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success("Pocket created.")
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  function loadPreview() {
    setError(undefined)
    startTransition(async () => {
      const result = await previewBulk({ prefix, total, distribution })
      if (result && "sample" in result && result.sample) {
        setSample(result as Sample)
        setStep("preview")
        return
      }
      setError(result && "error" in result ? result.error : "Could not build a preview.")
    })
  }

  function createMany() {
    startTransition(async () => {
      const result = await addBulkPockets({ prefix, total, distribution })
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success(`${result?.title} pockets created successfully.`)
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true) }}>+ Create Pocket</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Pocket</DialogTitle>
            <DialogDescription>
              {step === "mode" ? "How would you like to create pockets?" : "Accommodation pockets stay gender-specific."}
            </DialogDescription>
          </DialogHeader>

          {step === "mode" ? (
            <div className="grid gap-4">
              <RadioGroup value={mode} onValueChange={setMode}>
                <label className="flex items-center gap-3 text-sm">
                  <RadioGroupItem value="single" />
                  Create a single pocket
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <RadioGroupItem value="multiple" />
                  Create multiple pockets
                </label>
              </RadioGroup>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => setStep(mode === "single" ? "single" : "count")}>Continue</Button>
              </DialogFooter>
            </div>
          ) : null}

          {step === "single" ? (
            <form onSubmit={createSingle} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pocketName">Pocket name</Label>
                <Input id="pocketName" value={name} onChange={(event) => setName(event.target.value)} placeholder="Block A - Room 101" required />
              </div>
              <fieldset className="grid gap-2">
                <legend className="text-xs font-semibold tracking-wide uppercase">Pocket type</legend>
                <RadioGroup value={type} onValueChange={setType}>
                  {[
                    ["TYPE_1", "Type 1", "1 person"],
                    ["TYPE_2", "Type 2", "2 people"],
                    ["TYPE_3", "Type 3", "3 people"],
                  ].map(([value, title, detail]) => (
                    <label key={value} className="flex items-center gap-3 text-sm">
                      <RadioGroupItem value={value} />
                      <span>{title}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
              <fieldset className="grid gap-2">
                <legend className="text-xs font-semibold tracking-wide uppercase">Gender</legend>
                <RadioGroup value={gender} onValueChange={setGender}>
                  <label className="flex items-center gap-3 text-sm"><RadioGroupItem value="MALE" />Male</label>
                  <label className="flex items-center gap-3 text-sm"><RadioGroupItem value="FEMALE" />Female</label>
                </RadioGroup>
              </fieldset>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep("mode")}>Back</Button>
                <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create Pocket"}</Button>
              </DialogFooter>
            </form>
          ) : null}

          {step === "count" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="total">How many pockets do you want to create?</Label>
                <Input id="total" type="number" min={1} max={500} value={total} onChange={(event) => setTotal(Math.max(0, Number(event.target.value) || 0))} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("mode")}>Back</Button>
                <Button disabled={total < 1 || total > 500} onClick={() => setStep("distribution")}>Continue</Button>
              </DialogFooter>
            </div>
          ) : null}

          {step === "distribution" ? (
            <div className="grid gap-4">
              <p className="text-sm">How do you want to distribute the {total} pockets?</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs tracking-widest text-muted-foreground uppercase">
                      <th className="py-2 pr-3">Gender</th>
                      <th className="py-2 pr-3">Type 1</th>
                      <th className="py-2 pr-3">Type 2</th>
                      <th className="py-2 pr-3">Type 3</th>
                      <th className="py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["male", "female"] as const).map((group) => {
                      const row = distribution[group]
                      return (
                        <tr key={group} className="border-b">
                          <td className="py-3 pr-3">{group === "male" ? "Male" : "Female"}</td>
                          {(["type1", "type2", "type3"] as const).map((key) => (
                            <td key={key} className="py-3 pr-3">
                              <Input className="w-20" type="number" min={0} value={row[key]} onChange={(event) => setCount(group, key, event.target.value)} />
                            </td>
                          ))}
                          <td className="py-3 font-medium">{row.type1 + row.type2 + row.type3}</td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className="py-3 pr-3 font-semibold">Total</td>
                      <td className="py-3 pr-3 font-semibold">{distribution.male.type1 + distribution.female.type1}</td>
                      <td className="py-3 pr-3 font-semibold">{distribution.male.type2 + distribution.female.type2}</td>
                      <td className="py-3 pr-3 font-semibold">{distribution.male.type3 + distribution.female.type3}</td>
                      <td className="py-3 font-semibold">{configured}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm">Configured: {configured} / {total} {balanced ? "✓" : ""}</p>
              {balanced ? null : <p className="text-sm text-destructive">The pocket distribution must equal the total number of pockets.</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("count")}>Back</Button>
                <Button disabled={!balanced} onClick={() => setStep("preview")}>Continue</Button>
              </DialogFooter>
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prefix">Pocket name prefix</Label>
                <Input id="prefix" value={prefix} onChange={(event) => { setPrefix(event.target.value); setSample(undefined) }} />
              </div>
              <div className="grid gap-1 text-sm">
                <p className="font-medium">You are about to create {total} pockets</p>
                <p>Male</p>
                <Breakdown group={distribution.male} />
                <p className="mt-2">Female</p>
                <Breakdown group={distribution.female} />
              </div>
              {sample ? (
                <div className="grid max-h-64 gap-3 overflow-auto border p-3 text-sm">
                  <p className="text-xs tracking-widest text-muted-foreground uppercase">Preview</p>
                  {sample.sample.map((plan) => (
                    <div key={plan.name}>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-muted-foreground">{genderLabel(plan.gender)} · {typeLabel(plan.type)} · Capacity: {plan.capacity}</p>
                    </div>
                  ))}
                  {sample.remaining > 0 ? <p className="text-muted-foreground">and {sample.remaining} more</p> : null}
                  <p>{sample.total} pockets will be created.</p>
                </div>
              ) : (
                <Button variant="outline" disabled={pending} onClick={loadPreview}>Show preview</Button>
              )}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setSample(undefined); setStep("distribution") }}>Back</Button>
                <Button disabled={pending || !sample} onClick={createMany}>
                  {pending ? "Creating..." : `Create ${total} Pockets`}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Breakdown({ group }: { group: PocketDistribution["male"] }) {
  return (
    <div className="text-muted-foreground">
      {group.type1 ? <p>{group.type1} × Type 1</p> : null}
      {group.type2 ? <p>{group.type2} × Type 2</p> : null}
      {group.type3 ? <p>{group.type3} × Type 3</p> : null}
    </div>
  )
}
