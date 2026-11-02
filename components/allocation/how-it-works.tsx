"use client"

import { PauseIcon, PlayIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const SCENE_MS = 5000

const scenes = [
  {
    id: "choose",
    caption: "Sign in, then choose an available pocket that matches your gender.",
    frame: <ChooseFrame />,
  },
  {
    id: "partners",
    caption: "A single room books immediately. A shared room needs you to choose the other people.",
    frame: <PartnersFrame />,
  },
  {
    id: "requests",
    caption: "Those people receive an approval request, and the pocket leaves the list until they answer.",
    frame: <RequestsFrame />,
  },
  {
    id: "booked",
    caption: "The pocket is booked only after every selected person approves.",
    frame: <BookedFrame />,
  },
  {
    id: "released",
    caption: "If someone declines, everyone is released and the pocket is available again.",
    frame: <ReleasedFrame />,
  },
]

const totalMs = scenes.length * SCENE_MS

export function HowItWorks() {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    if (!open || !playing) return
    const startedAt = Date.now() - elapsedRef.current
    const timer = window.setInterval(() => {
      const next = Math.min(totalMs, Date.now() - startedAt)
      setElapsed(next)
      if (next >= totalMs) setPlaying(false)
    }, 200)
    return () => window.clearInterval(timer)
  }, [open, playing])

  function openWalkthrough() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    setElapsed(0)
    setPlaying(!reduceMotion)
    setOpen(true)
  }

  function togglePlayback() {
    if (elapsed >= totalMs) {
      setElapsed(0)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }

  const sceneIndex = Math.min(scenes.length - 1, Math.floor(elapsed / SCENE_MS))
  const scene = scenes[sceneIndex]
  const finished = elapsed >= totalMs

  return (
    <>
      <Button variant="outline" size="sm" onClick={openWalkthrough}>
        How it works
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setPlaying(false)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle>How pairing works</DialogTitle>
            <DialogDescription>A short walkthrough of choosing a pocket.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div
              className="relative h-44 overflow-hidden border bg-background sm:h-48"
              aria-live="polite"
            >
              <div key={scene.id} className="absolute inset-0 animate-in fade-in duration-300">
                {scene.frame}
              </div>
              {finished ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Button onClick={togglePlayback}>Play again</Button>
                </div>
              ) : null}
            </div>
            <p className="min-h-10 text-sm leading-relaxed">{scene.caption}</p>
            <div
              className="h-1 bg-muted"
              role="progressbar"
              aria-label="Walkthrough progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((elapsed / totalMs) * 100)}
            >
              <div
                className="h-full bg-foreground"
                style={{ width: `${(elapsed / totalMs) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayback}
                aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
                {playing ? "Pause" : "Play"}
              </Button>
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                {clock(elapsed)} / {clock(totalMs)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function clock(ms: number) {
  const seconds = Math.min(Math.floor(ms / 1000), Math.floor(totalMs / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, "0")}`
}

function ChooseFrame() {
  return (
    <Frame title="Available pockets">
      <PocketRow name="Block A - M2" detail="Type 2 · 2 people" active />
      <PocketRow name="Block A - M1" detail="Type 1 · 1 person" />
    </Frame>
  )
}

function PartnersFrame() {
  return (
    <Frame title="Block A - M2">
      <p className="text-xs text-muted-foreground">Select 1 person to join your pocket.</p>
      <div className="flex items-center gap-3 border px-3 py-2 ring-2 ring-foreground">
        <span className="size-3.5 bg-foreground" />
        <span>
          <span className="block text-sm">Grace Hopper</span>
          <span className="text-xs text-muted-foreground">grace@example.com</span>
        </span>
      </div>
      <span className="w-fit bg-foreground px-2 py-1 text-[10px] font-semibold tracking-widest text-background uppercase">
        Send approval requests
      </span>
    </Frame>
  )
}

function RequestsFrame() {
  return (
    <Frame title="Pending approval">
      <p className="text-sm">Waiting for Grace Hopper to approve Block A - M2.</p>
      <p className="border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Other trainees no longer see this pocket.
      </p>
    </Frame>
  )
}

function BookedFrame() {
  return (
    <Frame title="Accommodation booked">
      <p className="text-sm">Pocket: Block A - M2</p>
      <p className="text-sm">Roommates: Grace Hopper</p>
    </Frame>
  )
}

function ReleasedFrame() {
  return (
    <Frame title="Available again">
      <p className="text-sm">Grace declined, so Block A - M2 was released.</p>
      <PocketRow name="Block A - M2" detail="Type 2 · 2 people" active />
    </Frame>
  )
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3 bg-background p-4">
      <p className="font-heading text-sm tracking-wider uppercase sm:text-base">{title}</p>
      {children}
    </div>
  )
}

function PocketRow({
  name,
  detail,
  active = false,
}: {
  name: string
  detail: string
  active?: boolean
}) {
  return (
    <div
      className={
        active
          ? "flex items-center justify-between gap-3 border p-3 ring-2 ring-foreground"
          : "flex items-center justify-between gap-3 border p-3 opacity-60"
      }
    >
      <span>
        <span className="block text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="bg-foreground px-2 py-1 text-[10px] font-semibold tracking-widest text-background uppercase">
        Select
      </span>
    </div>
  )
}
