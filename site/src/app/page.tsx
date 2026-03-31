import Link from "next/link";

import { ContinueReadingBanner } from "@/components/continue-reading-banner";
import { FloatingChapterNav } from "@/components/floating-chapter-nav";
import { chapters, stats } from "@/lib/generated/chapters";
import { cn } from "@/lib/utils";

const frontmatter = chapters.filter((chapter) => chapter.storyId === "frontmatter");
const mainChapters = chapters.filter((chapter) => chapter.storyId !== "frontmatter");

function ReaderList({
  items,
  offset,
  title,
}: {
  items: typeof chapters;
  offset: number;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((chapter, index) => (
          <Link
            key={chapter.slug}
            href={chapter.href}
            className={cn(
              "group flex items-baseline gap-4 px-3 py-3 transition-colors",
            )}
          >
            <span className="min-w-0 space-y-1">
              <span className="block text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
                {index + 1 + offset}
              </span>
              <span className="reader-display block text-balance text-xl leading-tight text-foreground decoration-ink/45 decoration-[1px] underline-offset-[0.22em] group-hover:text-ink group-hover:underline">
                {chapter.title}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8 pt-24 sm:px-8 lg:px-12">
      <FloatingChapterNav showHomeLink={false} />
      <ContinueReadingBanner />

      <header className="mx-auto flex w-full max-w-[70ch] flex-col items-center gap-5 border-b border-border/80 pb-8 text-center">
        <h1 className="reader-display text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
          Переведенные главы
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <div>
            <span className="text-[0.68rem] tracking-[0.24em] uppercase">Страниц </span>
            <span className="text-foreground">{stats.readableChapterCount}</span>
          </div>
          <div>
            <span className="text-[0.68rem] tracking-[0.24em] uppercase">Переведено </span>
            <span className="text-foreground">
              {stats.translatedSegmentCount} / {stats.totalSegmentCount}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[70ch] space-y-8">
        {frontmatter.length > 0 ? <ReaderList items={frontmatter} offset={0} title="Вступление" /> : null}
        <ReaderList items={mainChapters} offset={frontmatter.length} title="Главы" />
      </div>
    </main>
  );
}
