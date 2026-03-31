import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { FloatingChapterNav } from "@/components/floating-chapter-nav";
import { ReadingProgressTracker } from "@/components/reading-progress-tracker";
import {
  chapters,
  getAdjacentChapters,
  getBook,
  getBookChapters,
  getChapter,
  getChapterModule,
} from "@/lib/chapters";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return chapters.map((chapter) => ({ bookSlug: chapter.bookSlug, slug: chapter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { bookSlug, slug } = await params;
  const chapter = getChapter(bookSlug, slug);
  const book = getBook(bookSlug);

  if (!chapter || !book) {
    return {};
  }

  return {
    title: `${chapter.title} | ${book.title} | HPMOR Fanfics RU`,
    description: `Онлайн-чтение переведенной главы ${chapter.title} из книги ${book.title}.`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ bookSlug: string; slug: string }>;
}) {
  const { bookSlug, slug } = await params;
  const book = getBook(bookSlug);
  const chapter = getChapter(bookSlug, slug);
  const loadModule = getChapterModule(slug);

  if (!book || !chapter || !loadModule) {
    notFound();
  }

  const { default: Content } = await loadModule();
  const { previous, next } = getAdjacentChapters(bookSlug, slug);
  const bookChapters = getBookChapters(bookSlug);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 pt-24 sm:px-8 lg:px-12">
      <ReadingProgressTracker
        href={chapter.href}
        chapterSlug={slug}
        chapterTitle={chapter.title}
        bookSlug={book.slug}
        bookTitle={book.title}
      />
      <FloatingChapterNav
        currentSlug={slug}
        previous={previous}
        next={next}
        chapters={bookChapters}
        chaptersTitle={book.title}
      />

      <header className="mx-auto flex w-full max-w-[70ch] flex-col items-center gap-5 border-b border-border/80 pb-8 text-center">
        <Link
          href={book.href}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-paper/72 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-paper hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Назад к книге
        </Link>

        <div className="space-y-2">
          <p className="text-[0.68rem] tracking-[0.24em] text-muted-foreground uppercase">
            {book.title}
          </p>
          <h1 className="reader-display text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
            {chapter.title}
          </h1>
        </div>
      </header>

      <article className="min-w-0">
        <div className="reader-content mx-auto max-w-[70ch]">
          <Content />
        </div>
      </article>

      <nav className="mx-auto grid w-full max-w-[70ch] gap-3 border-t border-border/80 pt-6 sm:grid-cols-2">
        <Link
          href={previous?.href ?? book.href}
          className={cn(
            "rounded-[1.5rem] border border-border/80 bg-paper/72 px-5 py-4 text-left transition-colors",
            "hover:bg-paper",
          )}
        >
          <span className="block text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
            {previous ? "Назад" : "К книге"}
          </span>
          <span className="reader-display mt-2 block text-xl leading-tight text-foreground">
            {previous ? previous.title : book.title}
          </span>
        </Link>

        <Link
          href={next?.href ?? book.href}
          className={cn(
            "rounded-[1.5rem] border border-border/80 bg-paper/72 px-5 py-4 text-left transition-colors",
            "hover:bg-paper",
          )}
        >
          <span className="block text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
            {next ? "Дальше" : "Конец"}
          </span>
          <span className="reader-display mt-2 block text-xl leading-tight text-foreground">
            {next ? next.title : "Вернуться к оглавлению книги"}
          </span>
        </Link>
      </nav>
    </main>
  );
}
