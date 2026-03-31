"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  READING_STATE_STORAGE_KEY,
  type ReadingState,
  parseReadingState,
} from "@/lib/reading-state";

export function ContinueReadingBanner() {
  const [readingState, setReadingState] = useState<ReadingState | null>(null);

  useEffect(() => {
    const sync = () => {
      setReadingState(
        parseReadingState(window.localStorage.getItem(READING_STATE_STORAGE_KEY)),
      );
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (!readingState) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <Link
        href={readingState.href}
        className="pointer-events-auto flex w-full max-w-[34rem] items-center justify-between gap-4 rounded-[1.35rem] border border-border/90 bg-paper/95 px-4 py-3 shadow-[0_10px_36px_rgb(0_0_0_/_0.05)] backdrop-blur-md transition-colors hover:bg-paper"
      >
        <span className="min-w-0">
          <span className="block text-[0.66rem] tracking-[0.18em] text-muted-foreground uppercase">
            Продолжить
          </span>
          {readingState.bookTitle ? (
            <span className="mt-1 block truncate text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
              {readingState.bookTitle}
            </span>
          ) : null}
          <span className="reader-display mt-1 block truncate text-base leading-tight text-foreground">
            {readingState.chapterTitle}
          </span>
        </span>

        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
          <ChevronRightIcon className="size-3.5" />
        </span>
      </Link>
    </div>
  );
}
