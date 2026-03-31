"use client"

import { useReadingFont } from "@/components/font-provider"
import { useIsMounted } from "@/lib/use-is-mounted"
import { cn } from "@/lib/utils"

function LineSpacingIcon({ roomy }: { roomy?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    >
      <path d="M8 6h11" />
      <path d="M8 18h11" />
      <path d="M5 9v6" />
      <path d={roomy ? "M3.5 7.5 5 6l1.5 1.5" : "M3.5 10.5 5 9l1.5 1.5"} />
      <path d={roomy ? "M3.5 16.5 5 18l1.5-1.5" : "M3.5 13.5 5 15l1.5-1.5"} />
    </svg>
  )
}

export function LineHeightSwitcher() {
  const isMounted = useIsMounted()
  const {
    canDecreaseLineHeight,
    canIncreaseLineHeight,
    decreaseLineHeight,
    increaseLineHeight,
  } = useReadingFont()

  if (!isMounted) {
    return <div className="h-8 w-[4rem] rounded-full opacity-0" aria-hidden />
  }

  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-paper/85 ring-1 ring-border/90 ring-inset backdrop-blur-sm">
      <button
        type="button"
        onClick={decreaseLineHeight}
        disabled={!canDecreaseLineHeight}
        aria-label="Уменьшить межстрочный интервал"
        title="Уменьшить межстрочный интервал"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          canDecreaseLineHeight ? "hover:bg-accent hover:text-foreground" : "cursor-not-allowed opacity-35",
        )}
      >
        <LineSpacingIcon />
      </button>

      <button
        type="button"
        onClick={increaseLineHeight}
        disabled={!canIncreaseLineHeight}
        aria-label="Увеличить межстрочный интервал"
        title="Увеличить межстрочный интервал"
        className={cn(
          "inline-flex size-8 items-center justify-center text-muted-foreground transition-colors",
          canIncreaseLineHeight ? "hover:bg-accent hover:text-foreground" : "cursor-not-allowed opacity-35",
        )}
      >
        <LineSpacingIcon roomy />
      </button>
    </div>
  )
}
