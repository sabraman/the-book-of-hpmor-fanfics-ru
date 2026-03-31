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
  slug,
  title,
}: {
  href: string;
  scrollY: number;
  slug: string;
  title: string;
}) {
  window.localStorage.setItem(
    READING_STATE_STORAGE_KEY,
    serializeReadingState({
      href,
      scrollY,
      slug,
      title,
      updatedAt: Date.now(),
    }),
  );
}

export function ReadingProgressTracker({
  href,
  slug,
  title,
}: {
  href: string;
  slug: string;
  title: string;
}) {
  const restoredRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const storedState = parseReadingState(
      window.localStorage.getItem(READING_STATE_STORAGE_KEY),
    );

    if (!restoredRef.current && storedState?.slug === slug && storedState.scrollY > 0) {
      restoredRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: storedState.scrollY, behavior: "auto" });
        });
      });
    }

    saveReadingState({ href, scrollY: window.scrollY, slug, title });

    const onScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        saveReadingState({ href, scrollY: window.scrollY, slug, title });
      });
    };

    const flush = () => {
      saveReadingState({ href, scrollY: window.scrollY, slug, title });
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
  }, [href, slug, title]);

  return null;
}
