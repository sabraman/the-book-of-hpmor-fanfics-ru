"use client"

import { AlignJustifyIcon, AlignLeftIcon } from "lucide-react"

import { useReadingFont } from "@/components/font-provider"
import { useIsMounted } from "@/lib/use-is-mounted"
import { cn } from "@/lib/utils"

export function TextAlignSwitcher() {
  const isMounted = useIsMounted()
  const { setTextAlign, textAlign } = useReadingFont()

  if (!isMounted) {
    return <div className="h-8 w-[4rem] rounded-full opacity-0" aria-hidden />
  }

  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-paper/85 ring-1 ring-border/90 ring-inset backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setTextAlign("left")}
        aria-label="Выравнивание по левому краю"
        title="Выравнивание по левому краю"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          textAlign === "left" ? "bg-accent text-foreground" : "hover:bg-accent hover:text-foreground",
        )}
      >
        <AlignLeftIcon className="size-4" />
      </button>

      <button
        type="button"
        onClick={() => setTextAlign("justify")}
        aria-label="Выравнивание по ширине"
        title="Выравнивание по ширине"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          textAlign === "justify" ? "bg-accent text-foreground" : "hover:bg-accent hover:text-foreground",
        )}
      >
        <AlignJustifyIcon className="size-4" />
      </button>
    </div>
  )
}
