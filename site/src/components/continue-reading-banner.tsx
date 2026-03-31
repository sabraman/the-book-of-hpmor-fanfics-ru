"use client";

import Link from "next/link";
import { ChevronRightIcon, HistoryIcon } from "lucide-react";
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
        className="pointer-events-auto flex w-full max-w-[42rem] items-center justify-between gap-4 rounded-[1.75rem] border border-border/90 bg-paper/95 px-5 py-4 shadow-[0_10px_40px_rgb(0_0_0_/_0.08)] backdrop-blur-md transition-colors hover:bg-paper"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-foreground">
            <HistoryIcon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] tracking-[0.2em] text-muted-foreground uppercase">
              Продолжить чтение
            </span>
            <span className="reader-display mt-1 block truncate text-lg leading-tight text-foreground">
              {readingState.title}
            </span>
          </span>
        </span>

        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground">
          <ChevronRightIcon className="size-4" />
        </span>
      </Link>
    </div>
  );
}
