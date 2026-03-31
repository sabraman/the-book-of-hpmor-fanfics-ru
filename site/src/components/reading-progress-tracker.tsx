"use client";

import { useEffect, useRef } from "react";

import {
  READING_STATE_STORAGE_KEY,
  parseReadingState,
  serializeReadingState,
} from "@/lib/reading-state";

function saveReadingState({
  href,
  scrollY,
  chapterSlug,
  chapterTitle,
  bookSlug,
  bookTitle,
}: {
  href: string;
  scrollY: number;
  chapterSlug: string;
  chapterTitle: string;
  bookSlug: string | null;
  bookTitle: string | null;
}) {
  window.localStorage.setItem(
    READING_STATE_STORAGE_KEY,
    serializeReadingState({
      href,
      scrollY,
      chapterSlug,
      chapterTitle,
      bookSlug,
      bookTitle,
      updatedAt: Date.now(),
    }),
  );
}

export function ReadingProgressTracker({
  href,
  chapterSlug,
  chapterTitle,
  bookSlug,
  bookTitle,
}: {
  href: string;
  chapterSlug: string;
  chapterTitle: string;
  bookSlug: string | null;
  bookTitle: string | null;
}) {
  const restoredRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const storedState = parseReadingState(
      window.localStorage.getItem(READING_STATE_STORAGE_KEY),
    );
    const currentPath = window.location.pathname;
    const shouldRestore =
      storedState !== null &&
      storedState.scrollY > 0 &&
      (storedState.href === currentPath ||
        storedState.chapterSlug === chapterSlug ||
        (storedState.bookSlug === bookSlug && storedState.chapterSlug === chapterSlug));

    if (!restoredRef.current && shouldRestore && storedState) {
      restoredRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: storedState.scrollY, behavior: "auto" });
        });
      });
    }

    saveReadingState({
      href,
      scrollY: window.scrollY,
      chapterSlug,
      chapterTitle,
      bookSlug,
      bookTitle,
    });

    const onScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        saveReadingState({
          href,
          scrollY: window.scrollY,
          chapterSlug,
          chapterTitle,
          bookSlug,
          bookTitle,
        });
      });
    };

    const flush = () => {
      saveReadingState({
        href,
        scrollY: window.scrollY,
        chapterSlug,
        chapterTitle,
        bookSlug,
        bookTitle,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      flush();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [bookSlug, bookTitle, chapterSlug, chapterTitle, href]);

  return null;
}
