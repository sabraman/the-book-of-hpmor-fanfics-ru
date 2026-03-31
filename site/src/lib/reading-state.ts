export const READING_STATE_STORAGE_KEY = "reader-last-state";

export type ReadingState = {
  href: string;
  scrollY: number;
  slug: string;
  title: string;
  updatedAt: number;
};

export function parseReadingState(value: string | null): ReadingState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ReadingState>;

    if (
      typeof parsed?.slug !== "string" ||
      typeof parsed?.title !== "string" ||
      typeof parsed?.href !== "string" ||
      typeof parsed?.scrollY !== "number" ||
      typeof parsed?.updatedAt !== "number"
    ) {
      return null;
    }

    return parsed as ReadingState;
  } catch {
    return null;
  }
}

export function serializeReadingState(state: ReadingState) {
  return JSON.stringify(state);
}
