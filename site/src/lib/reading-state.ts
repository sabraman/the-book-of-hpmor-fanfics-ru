export const READING_STATE_STORAGE_KEY = "reader-last-state";

export type ReadingState = {
  href: string;
  scrollY: number;
  chapterSlug: string;
  chapterTitle: string;
  bookSlug: string | null;
  bookTitle: string | null;
  updatedAt: number;
};

export function parseReadingState(value: string | null): ReadingState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      href?: unknown;
      scrollY?: unknown;
      slug?: unknown;
      title?: unknown;
      chapterSlug?: unknown;
      chapterTitle?: unknown;
      bookSlug?: unknown;
      bookTitle?: unknown;
      updatedAt?: unknown;
    };

    const chapterSlug =
      typeof parsed.chapterSlug === "string"
        ? parsed.chapterSlug
        : typeof parsed.slug === "string"
          ? parsed.slug
          : null;
    const chapterTitle =
      typeof parsed.chapterTitle === "string"
        ? parsed.chapterTitle
        : typeof parsed.title === "string"
          ? parsed.title
          : null;

    if (
      typeof parsed.href !== "string" ||
      typeof parsed.scrollY !== "number" ||
      typeof parsed.updatedAt !== "number" ||
      !chapterSlug ||
      !chapterTitle
    ) {
      return null;
    }

    return {
      href: parsed.href,
      scrollY: parsed.scrollY,
      chapterSlug,
      chapterTitle,
      bookSlug: typeof parsed.bookSlug === "string" ? parsed.bookSlug : null,
      bookTitle: typeof parsed.bookTitle === "string" ? parsed.bookTitle : null,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeReadingState(state: ReadingState) {
  return JSON.stringify(state);
}
