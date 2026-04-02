import {
  books,
  chapters as generatedChapters,
  chapterModules,
  stats,
  type BookMeta,
  type ChapterMeta as GeneratedChapterMeta,
} from "@/lib/generated/catalog";
import {
  chapterAudioBySlug,
} from "@/lib/chapter-audio-catalog";
import type { ChapterAudioMeta } from "@/lib/chapter-audio";

const bookMap = new Map(books.map((book) => [book.slug, book]));
export type ChapterMeta = GeneratedChapterMeta & {
  audio?: ChapterAudioMeta;
};

const chapters: ChapterMeta[] = generatedChapters.map((chapter) => {
  const audio = chapterAudioBySlug[chapter.slug];

  if (!audio) {
    return chapter;
  }

  return {
    ...chapter,
    audio,
  };
});

const chapterSlugMap = new Map(chapters.map((chapter) => [chapter.slug, chapter]));
const chapterMap = new Map(chapters.map((chapter) => [`${chapter.bookSlug}:${chapter.slug}`, chapter]));

export { books, chapters, stats };
export type { BookMeta, ChapterAudioMeta };

export function getBook(bookSlug: string): BookMeta | undefined {
  return bookMap.get(bookSlug);
}

export function getBooksForHome() {
  return books.filter((book) => book.id !== "frontmatter" && book.readableChapterCount > 0);
}

export function getPrefaceBook() {
  return books.find((book) => book.id === "frontmatter" && book.readableChapterCount > 0);
}

export function getBookChapters(bookSlug: string) {
  return chapters.filter((chapter) => chapter.bookSlug === bookSlug);
}

export function getChapter(bookSlug: string, slug: string): ChapterMeta | undefined {
  return chapterMap.get(`${bookSlug}:${slug}`);
}

export function getChapterBySlug(slug: string): ChapterMeta | undefined {
  return chapterSlugMap.get(slug);
}

export function getChapterModule(slug: string) {
  return chapterModules[slug as keyof typeof chapterModules];
}

export function getAdjacentChapters(bookSlug: string, slug: string) {
  const bookChapters = getBookChapters(bookSlug);
  const index = bookChapters.findIndex((chapter) => chapter.slug === slug);

  if (index === -1) {
    return { previous: undefined, next: undefined, index: -1 };
  }

  return {
    previous: bookChapters[index - 1],
    next: bookChapters[index + 1],
    index,
  };
}
