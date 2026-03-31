"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ChaptersSheet } from "@/components/chapters-sheet"
import { FontSizeSwitcher } from "@/components/font-size-switcher"
import { FontSwitcher } from "@/components/font-switcher"
import { LineHeightSwitcher } from "@/components/line-height-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher/theme-switcher"
import { TextAlignSwitcher } from "@/components/text-align-switcher"
import type { ChapterMeta } from "@/lib/chapters"
import { cn } from "@/lib/utils"

type NavLink = {
  href: string
  title: string
}

export function FloatingChapterNav({
  currentSlug,
  previous,
  next,
  chapters,
  chaptersTitle = "Главы книги",
}: {
  currentSlug?: string
  previous?: NavLink
  next?: NavLink
  chapters?: ChapterMeta[]
  chaptersTitle?: string
}) {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const hasSheet = Boolean(chapters?.length)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastY.current

      if (currentY < 24) {
        setVisible(true)
      } else if (delta > 8) {
        setVisible(false)
      } else if (delta < -8) {
        setVisible(true)
      }

      lastY.current = currentY
    }

    lastY.current = window.scrollY
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
      )}
    >
      <div className="pointer-events-auto hidden items-center gap-2 rounded-full border border-border/90 bg-paper/92 px-3 py-2 shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] backdrop-blur-md sm:flex dark:shadow-[0_8px_30px_rgb(0_0_0_/_0.28)]">
        {hasSheet ? (
          <>
            <ChaptersSheet chapters={chapters ?? []} currentSlug={currentSlug} title={chaptersTitle} />
            <div className="h-5 w-px bg-border" />
          </>
        ) : null}

        {previous || next ? (
          <>
            <Link
              href={previous?.href ?? "/"}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={previous ? `Назад: ${previous.title}` : "К списку"}
              title={previous ? previous.title : "К списку"}
            >
              <ChevronLeftIcon className="size-4" />
            </Link>

            <Link
              href={next?.href ?? "/"}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={next ? `Дальше: ${next.title}` : "К списку"}
              title={next ? next.title : "К списку"}
            >
              <ChevronRightIcon className="size-4" />
            </Link>

            <div className="h-5 w-px bg-border" />
          </>
        ) : null}

        <FontSwitcher />
        <FontSizeSwitcher />
        <LineHeightSwitcher />
        <TextAlignSwitcher />
        <ThemeSwitcher />
      </div>

      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-[1.75rem] border border-border/90 bg-paper/92 p-2 shadow-[0_8px_30px_rgb(0_0_0_/_0.06)] backdrop-blur-md sm:hidden dark:shadow-[0_8px_30px_rgb(0_0_0_/_0.28)]">
        <div className="flex items-center justify-between gap-2">
          {hasSheet ? (
            <ChaptersSheet chapters={chapters ?? []} currentSlug={currentSlug} title={chaptersTitle} />
          ) : null}

          {previous || next ? (
            <>
              <Link
                href={previous?.href ?? "/"}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={previous ? `Назад: ${previous.title}` : "К списку"}
                title={previous ? previous.title : "К списку"}
              >
                <ChevronLeftIcon className="size-4" />
              </Link>

              <Link
                href={next?.href ?? "/"}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={next ? `Дальше: ${next.title}` : "К списку"}
                title={next ? next.title : "К списку"}
              >
                <ChevronRightIcon className="size-4" />
              </Link>
            </>
          ) : null}

          <div className="min-w-0 flex-1">
            <FontSwitcher compact />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <FontSizeSwitcher />
          <LineHeightSwitcher />
          <TextAlignSwitcher />
          <div className="min-w-0 shrink-0">
            <ThemeSwitcher compact />
          </div>
        </div>
      </div>
    </div>
  )
}
