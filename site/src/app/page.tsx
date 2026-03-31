import Link from "next/link";

import { ContinueReadingBanner } from "@/components/continue-reading-banner";
import { FloatingChapterNav } from "@/components/floating-chapter-nav";
import {
  getBookChapters,
  getBooksForHome,
  getPrefaceBook,
  stats,
} from "@/lib/chapters";
import { cn } from "@/lib/utils";

const books = getBooksForHome();
const prefaceBook = getPrefaceBook();
const prefaceChapter = prefaceBook ? getBookChapters(prefaceBook.slug)[0] : undefined;

function progressLabel(readableChapterCount: number, totalChapterCount: number) {
  if (readableChapterCount >= totalChapterCount) {
    return "Полностью переведена";
  }

  return `${readableChapterCount} / ${totalChapterCount} глав`;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 pt-24 sm:px-8 lg:px-12">
      <FloatingChapterNav />
      <ContinueReadingBanner />

      <header className="mx-auto flex w-full max-w-[70ch] flex-col items-center gap-5 border-b border-border/80 pb-8 text-center">
        <h1 className="reader-display text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
          Переведенные книги
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <div>
            <span className="text-[0.68rem] tracking-[0.24em] uppercase">Книг </span>
            <span className="text-foreground">{stats.readableBookCount}</span>
          </div>
          <div>
            <span className="text-[0.68rem] tracking-[0.24em] uppercase">Глав </span>
            <span className="text-foreground">{stats.readableChapterCount}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[70ch] space-y-10">
        {prefaceChapter ? (
          <section className="space-y-3">
            <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">
              Вступление
            </p>
            <Link
              href={prefaceChapter.href}
              className="group flex items-baseline gap-4 px-3 py-3 transition-colors"
            >
              <span className="min-w-0 space-y-1">
                <span className="block text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                  1
                </span>
                <span className="reader-display block text-balance text-xl leading-tight text-foreground decoration-ink/45 decoration-[1px] underline-offset-[0.22em] group-hover:text-ink group-hover:underline">
                  {prefaceChapter.title}
                </span>
              </span>
            </Link>
          </section>
        ) : null}

        <section className="space-y-3">
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">
            Книги
          </p>
          <div className="space-y-1">
            {books.map((book, index) => (
              <Link
                key={book.slug}
                href={book.href}
                className={cn("group flex gap-4 px-3 py-4 transition-colors")}
              >
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="block text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {index + 1}
                  </span>
                  <span className="reader-display block text-balance text-2xl leading-tight text-foreground decoration-ink/45 decoration-[1px] underline-offset-[0.22em] group-hover:text-ink group-hover:underline">
                    {book.title}
                  </span>
                  {book.title !== book.originalTitle ? (
                    <span className="block text-sm leading-6 text-muted-foreground">
                      {book.originalTitle}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 pt-7 text-right text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {progressLabel(book.readableChapterCount, book.totalChapterCount)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
