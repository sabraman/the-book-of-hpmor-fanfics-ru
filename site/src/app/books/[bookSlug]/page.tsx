import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { FloatingChapterNav } from "@/components/floating-chapter-nav";
import { getBook, getBookChapters, books } from "@/lib/chapters";

export const dynamicParams = false;

export function generateStaticParams() {
  return books
    .filter((book) => book.readableChapterCount > 0)
    .map((book) => ({ bookSlug: book.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookSlug: string }>;
}): Promise<Metadata> {
  const { bookSlug } = await params;
  const book = getBook(bookSlug);

  if (!book || book.readableChapterCount === 0) {
    return {};
  }

  return {
    title: `${book.title} | HPMOR Fanfics RU`,
    description: `Онлайн-чтение переведенных глав книги ${book.title}.`,
  };
}

function progressLabel(readableChapterCount: number, totalChapterCount: number) {
  if (readableChapterCount >= totalChapterCount) {
    return "Полностью переведена";
  }

  return `${readableChapterCount} / ${totalChapterCount} глав`;
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ bookSlug: string }>;
}) {
  const { bookSlug } = await params;
  const book = getBook(bookSlug);

  if (!book || book.readableChapterCount === 0) {
    notFound();
  }

  const chapters = getBookChapters(bookSlug);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 pt-32 sm:px-8 sm:pt-28 lg:px-12">
      <FloatingChapterNav />

      <header className="mx-auto flex w-full max-w-[70ch] flex-col items-center gap-5 border-b border-border/80 pb-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-paper/72 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-paper hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Назад к книгам
        </Link>

        <div className="space-y-3">
          <h1 className="reader-display text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
            {book.title}
          </h1>
          <p className="text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
            {progressLabel(book.readableChapterCount, book.totalChapterCount)}
          </p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[70ch] space-y-1">
        {chapters.map((chapter) => (
          <Link
            key={chapter.slug}
            href={chapter.href}
            className="group block px-3 py-3 transition-colors"
          >
            <span className="block min-w-0 space-y-1">
              <span className="block text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                {chapter.orderWithinBook}
              </span>
              <span className="reader-display block text-balance text-xl leading-tight text-foreground decoration-ink/45 decoration-[1px] underline-offset-[0.22em] group-hover:text-ink group-hover:underline">
                {chapter.title}
              </span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
