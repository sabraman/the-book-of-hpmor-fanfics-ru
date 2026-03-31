"use client"

import { useTheme } from "next-themes"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMounted } from "@/lib/use-is-mounted"

const THEME_OPTIONS = [
  {
    label: "Бумага",
    value: "light",
  },
  {
    label: "Сепия",
    value: "sepia",
  },
  {
    label: "Ночь",
    value: "dark",
  },
] as const

type ReaderTheme = (typeof THEME_OPTIONS)[number]["value"]

function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const isMounted = useIsMounted()

  if (!isMounted) {
    return <div className="h-9 w-fit rounded-full border border-border/90 px-3.5 opacity-0">Тема</div>
  }

  return (
    <Select
      items={THEME_OPTIONS}
      defaultValue={resolvedTheme === "dark" ? "dark" : "light"}
      value={theme === "system" ? (resolvedTheme === "dark" ? "dark" : "light") : theme}
      onValueChange={(value) => setTheme(value as ReaderTheme)}
    >
      <SelectTrigger
        aria-label="Тема оформления"
        className={
          compact
            ? "h-9 min-w-0 rounded-full border-border/90 bg-paper/92 px-3 text-sm font-medium tracking-normal text-foreground shadow-none ring-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
            : "h-9 shrink-0 rounded-full border-border/90 bg-paper/92 text-sm font-medium tracking-normal text-foreground shadow-none ring-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
        }
      >
        <SelectValue className={compact ? "truncate" : "max-w-none flex-none"} placeholder="Тема" />
      </SelectTrigger>
      <SelectContent
        align="end"
        className="rounded-[1.125rem] border-border/90 bg-paper text-foreground"
      >
        <SelectGroup>
          {THEME_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="rounded-xl text-[0.95rem]"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export { ThemeSwitcher }
