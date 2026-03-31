"use client";

import Link from "next/link";
import { ChevronLeftIcon, ListIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { chapters } from "@/lib/generated/chapters";
import { cn } from "@/lib/utils";

function chapterLabel(index: number, storyId: string) {
  if (storyId === "frontmatter") {
    return String(index + 1);
  }

  return String(index + 1);
}

export function ChaptersSheet({
  currentSlug,
  trigger = "icon",
}: {
  currentSlug?: string;
  trigger?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger === "button" ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-paper/72 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-paper hover:text-foreground"
              type="button"
            >
              <ChevronLeftIcon className="size-4" />
              Назад к главам
            </button>
          ) : (
            <button
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              type="button"
              aria-label="Все главы"
              title="Все главы"
            >
              <ListIcon className="size-4" />
            </button>
          )
        }
      />

      <SheetPopup side="left" variant="inset" showCloseButton={false} className="bg-paper/98">
        <SheetHeader>
          <SheetTitle>Все главы</SheetTitle>
        </SheetHeader>

        <SheetPanel className="pt-0">
          <div className="flex flex-col gap-1">
            {chapters.map((chapter, index) => {
              const isActive = chapter.slug === currentSlug;

              return (
                <Link
                  key={chapter.slug}
                  href={chapter.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-lg px-3 py-3 text-foreground transition-colors",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-3 bottom-3 w-px rounded-full bg-transparent transition-colors",
                      isActive ? "bg-foreground/70" : "group-hover:bg-foreground/35",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-6 pt-0.5 text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {chapterLabel(index, chapter.storyId)}
                  </span>
                  <span className="min-w-0">
                    <span className="reader-display block text-balance text-lg leading-tight">
                      {chapter.title}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetPanel>

        <SheetFooter variant="bare">
          <SheetClose render={<Button variant="ghost" className="cursor-pointer" />}>
            Закрыть
          </SheetClose>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
