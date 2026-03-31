"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

import { useReadingFont } from "@/components/font-provider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ALL_READING_FONTS,
  FONT_GROUPS,
  type ReadingFontOption,
  type ReadingFont,
} from "@/lib/reading-fonts"

export function FontSwitcher({ compact = false }: { compact?: boolean }) {
  const { font, setFont } = useReadingFont()
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [controlWidth, setControlWidth] = useState<number | null>(null)
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const items: readonly ReadingFontOption[] = ALL_READING_FONTS

  useEffect(() => {
    if (!isMounted) {
      return
    }

    const measure = () => {
      const nodes = measureRef.current?.querySelectorAll<HTMLElement>("[data-measure-item]")

      if (!nodes?.length) {
        return
      }

      const widest = Math.max(...Array.from(nodes, (node) => node.offsetWidth))

      setControlWidth(widest)
    }

    measure()

    const fonts = document.fonts

    void fonts.ready.then(measure)
    fonts.addEventListener("loadingdone", measure)

    return () => fonts.removeEventListener("loadingdone", measure)
  }, [isMounted])

  if (!isMounted) {
    return <div className="h-9 w-fit rounded-full border border-border/90 px-3.5 opacity-0">Шрифт</div>
  }

  const widthStyle = !compact && controlWidth ? { width: `${controlWidth}px` } : undefined

  return (
    <>
      <div ref={measureRef} className="pointer-events-none fixed -top-[9999px] left-0 invisible">
        {FONT_GROUPS.flatMap((group) =>
          group.options.map((option) => (
            <div
              key={option.value}
              data-measure-item
              className="w-fit rounded-xl py-2 pr-8 pl-2.5 text-[0.95rem] whitespace-nowrap"
            >
              {option.label}
            </div>
          )),
        )}
      </div>

      <Select
        items={items}
        defaultValue={font}
        value={font}
        onValueChange={(value) => setFont(value as ReadingFont)}
      >
        <SelectTrigger
          aria-label="Reading font"
          style={widthStyle}
          className={
            compact
              ? "h-9 w-full min-w-0 rounded-full border-border/90 bg-paper/92 text-sm font-medium tracking-normal text-foreground shadow-none ring-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
              : "h-9 shrink-0 rounded-full border-border/90 bg-paper/92 text-sm font-medium tracking-normal text-foreground shadow-none ring-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
          }
        >
          <SelectValue
            className={compact ? "min-w-0 truncate" : "max-w-none flex-none"}
            placeholder="Шрифт"
          />
        </SelectTrigger>
        <SelectContent
          align="end"
          style={compact ? undefined : widthStyle}
          className="rounded-[1.125rem] border-border/90 bg-paper text-foreground"
        >
          {FONT_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="px-2 pt-2 pb-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
                {group.label}
              </SelectLabel>
              {group.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-xl text-[0.95rem]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
