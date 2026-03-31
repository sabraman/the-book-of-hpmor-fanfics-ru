# HPMOR Fanfics Reader

Минималистичная Next.js-читалка для переведенных сегментов из
`../books/various-muggles/output/`.

## Стек

- Next.js 16 App Router
- локальный MDX-контент
- shadcn для source-owned UI foundation
- Bun для всех package-manager и script-команд
- статический export для простого хостинга

## Команды

Синхронизировать контент из translation workspace:

```bash
bun run sync-content
```

Проверить код:

```bash
bun run lint
bun run typecheck
```

Запуск локально:

```bash
bun run dev
```

## Как это устроено

1. `scripts/sync-content.ts` читает `../books/various-muggles/manifest.json`.
2. Скрипт находит реально существующие переведенные `.md`-сегменты.
3. Контент очищается от EPUB-оберток и пишется в `src/content/chapters/*.mdx`.
4. Генерируется `src/lib/generated/chapters.ts` с метаданными и import map.
5. Страницы `src/app/chapters/[slug]/page.tsx` статически пререндерятся через `generateStaticParams`.

## Принцип дизайна

Читалка намеренно сделана спокойной и почти книжной:

- теплый paper-like фон вместо дефолтного белого
- serif-типографика для чтения, sans-serif для интерфейса
- одна колонка текста без лишних панелей
- только список доступных переводов и соседняя навигация по главам
