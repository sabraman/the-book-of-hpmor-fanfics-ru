import { chapterModules, chapters, type ChapterMeta } from "@/lib/generated/chapters";

const chapterMap = new Map(chapters.map((chapter) => [chapter.slug, chapter]));

export { chapters };
export type { ChapterMeta };

export function getChapter(slug: string): ChapterMeta | undefined {
  return chapterMap.get(slug);
}

export function getChapterModule(slug: string) {
  return chapterModules[slug as keyof typeof chapterModules];
}

export function getAdjacentChapters(slug: string) {
  const index = chapters.findIndex((chapter) => chapter.slug === slug);

  if (index === -1) {
    return { previous: undefined, next: undefined, index: -1 };
  }

  return {
    previous: chapters[index - 1],
    next: chapters[index + 1],
    index,
  };
}
