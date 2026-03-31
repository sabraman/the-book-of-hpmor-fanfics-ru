import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10 sm:px-8">
      <p className="text-[0.72rem] tracking-[0.26em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="font-serif text-5xl leading-none tracking-[-0.05em] text-foreground">
        Эта глава пока недоступна в онлайн-читалке.
      </h1>
      <p className="max-w-xl text-base leading-7 text-muted-foreground">
        Скорее всего, сегмент еще не переведен или не был синхронизирован в MDX-контент сайта.
      </p>
      <div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-paper"
        >
          Вернуться к книгам
        </Link>
      </div>
    </main>
  );
}
