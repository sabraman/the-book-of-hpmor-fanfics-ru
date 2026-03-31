"use client";

import Link from "next/link";
import { ListIcon } from "lucide-react";
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
import type { ChapterMeta } from "@/lib/chapters";
import { cn } from "@/lib/utils";

export function ChaptersSheet({
  chapters,
  currentSlug,
  title,
}: {
  chapters: ChapterMeta[];
  currentSlug?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="Главы книги"
            title="Главы книги"
          >
            <ListIcon className="size-4" />
          </button>
        }
      />

      <SheetPopup side="left" variant="inset" showCloseButton={false} className="bg-paper/98">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <SheetPanel className="pt-0">
          <div className="flex flex-col gap-1">
            {chapters.map((chapter) => {
              const isActive = chapter.slug === currentSlug;

              return (
                <Link
                  key={chapter.slug}
                  href={chapter.href}
                  onClick={() => setOpen(false)}
                  className="group relative flex items-start gap-3 rounded-lg px-3 py-3 text-foreground transition-colors"
                >
                  <span
                    className={cn(
                      "absolute left-0 top-3 bottom-3 w-px rounded-full bg-transparent transition-colors",
                      isActive ? "bg-foreground/70" : "group-hover:bg-foreground/35",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-6 pt-0.5 text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {chapter.orderWithinBook}
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
