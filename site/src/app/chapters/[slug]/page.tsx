import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { FloatingChapterNav } from "@/components/floating-chapter-nav";
import { ReadingProgressTracker } from "@/components/reading-progress-tracker";
import { chapters } from "@/lib/generated/chapters";
import { getAdjacentChapters, getChapter, getChapterModule } from "@/lib/chapters";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return chapters.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);

  if (!chapter) {
    return {};
  }

  return {
    title: `${chapter.title} | HPMOR Fanfics RU`,
    description: `Онлайн-чтение переведенного сегмента ${chapter.title}.`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  const loadModule = getChapterModule(slug);

  if (!chapter || !loadModule) {
    notFound();
  }

  const { default: Content } = await loadModule();
  const { previous, next } = getAdjacentChapters(slug);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 pt-24 sm:px-8 lg:px-12">
      <ReadingProgressTracker href={chapter.href} slug={slug} title={chapter.title} />
      <FloatingChapterNav currentSlug={slug} previous={previous} next={next} />

      <header className="mx-auto flex w-full max-w-[70ch] flex-col items-center gap-5 border-b border-border/80 pb-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-paper/72 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-paper hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Назад на главную
        </Link>

        <h1 className="reader-display text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
          {chapter.title}
        </h1>
      </header>

      <article className="min-w-0">
        <div className="reader-content mx-auto max-w-[70ch]">
          <Content />
        </div>
      </article>

      <nav className="mx-auto grid w-full max-w-[70ch] gap-3 border-t border-border/80 pt-6 sm:grid-cols-2">
        <Link
          href={previous?.href ?? "/"}
          className={cn(
            "rounded-[1.5rem] border border-border/80 bg-paper/72 px-5 py-4 text-left transition-colors",
            "hover:bg-paper",
          )}
        >
          <span className="block text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
            {previous ? "Назад" : "К списку"}
          </span>
          <span className="reader-display mt-2 block text-xl leading-tight text-foreground">
            {previous ? previous.title : "Все доступные главы"}
          </span>
        </Link>

        <Link
          href={next?.href ?? "/"}
          className={cn(
            "rounded-[1.5rem] border border-border/80 bg-paper/72 px-5 py-4 text-left transition-colors",
            "hover:bg-paper",
          )}
        >
          <span className="block text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
            {next ? "Дальше" : "Конец"}
          </span>
          <span className="reader-display mt-2 block text-xl leading-tight text-foreground">
            {next ? next.title : "Вернуться к оглавлению"}
          </span>
        </Link>
      </nav>
    </main>
  );
}
