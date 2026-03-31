import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10 pt-32 sm:px-8 sm:pt-28">
      <p className="text-[0.72rem] tracking-[0.26em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="reader-display text-5xl leading-none tracking-[-0.05em] text-foreground">
        Эта страница пока недоступна в онлайн-читалке.
      </h1>
      <p className="reader-text max-w-xl text-base leading-7 text-muted-foreground">
        Скорее всего, глава еще не переведена, не была синхронизирована или ссылка устарела.
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
