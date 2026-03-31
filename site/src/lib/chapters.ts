import {
  books,
  chapters,
  chapterModules,
  stats,
  type BookMeta,
  type ChapterMeta,
} from "@/lib/generated/catalog";

const bookMap = new Map(books.map((book) => [book.slug, book]));
const chapterSlugMap = new Map(chapters.map((chapter) => [chapter.slug, chapter]));
const chapterMap = new Map(chapters.map((chapter) => [`${chapter.bookSlug}:${chapter.slug}`, chapter]));

export { books, chapters, stats };
export type { BookMeta, ChapterMeta };

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
