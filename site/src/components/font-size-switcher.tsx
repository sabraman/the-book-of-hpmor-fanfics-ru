"use client"

import { useReadingFont } from "@/components/font-provider"
import { useIsMounted } from "@/lib/use-is-mounted"
import { cn } from "@/lib/utils"

export function FontSizeSwitcher() {
  const isMounted = useIsMounted()
  const {
    canDecreaseFontScale,
    canIncreaseFontScale,
    decreaseFontScale,
    increaseFontScale,
  } = useReadingFont()

  if (!isMounted) {
    return <div className="h-8 w-[4rem] rounded-full opacity-0" aria-hidden />
  }

  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-paper/85 ring-1 ring-border/90 ring-inset backdrop-blur-sm">
      <button
        type="button"
        onClick={decreaseFontScale}
        disabled={!canDecreaseFontScale}
        aria-label="Уменьшить размер текста"
        title="Уменьшить размер текста"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          canDecreaseFontScale ? "hover:bg-accent hover:text-foreground" : "cursor-not-allowed opacity-35",
        )}
      >
        <span className="text-sm font-medium leading-none">A</span>
      </button>

      <button
        type="button"
        onClick={increaseFontScale}
        disabled={!canIncreaseFontScale}
        aria-label="Увеличить размер текста"
        title="Увеличить размер текста"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          canIncreaseFontScale ? "hover:bg-accent hover:text-foreground" : "cursor-not-allowed opacity-35",
        )}
      >
        <span className="text-lg font-medium leading-none">A</span>
      </button>
    </div>
  )
}
