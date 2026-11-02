"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        className={cn("pr-8", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1/2 right-0 -translate-y-1/2"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
