# The Book of HPMOR Fanfics RU

[English README](README.md)

Репозиторий с рабочим пространством и пайплайном для перевода *The Book of
HPMOR Fanfics* на русский язык.

Здесь используется markdown-first workflow: исходный EPUB импортируется в
разбитые на сегменты Markdown-файлы, перевод хранится в
`books/various-muggles/output/`, состояние синхронизируется через manifest, а
превью собираются прямо из текущего состояния перевода.

## Источники Нормы Перевода

- Potter's Army является основным источником имен, названий, заклинаний,
  учреждений и устойчивой терминологии мира Harry Potter.
- Выравнивание с РОСМЭН следует из выбора канона Potter's Army.
- `hpmor.ru` является источником для русского названия HPMOR, прецедентов по
  заголовкам глав и устоявшихся формулировок, специфичных для HPMOR.
- Спивак используется как ориентир по качеству и естественности прозы, но не
  как источник именования.

Принятые в репозитории названия:

- Полное название: `Гарри Поттер и методы рационального мышления`
- Короткая форма: `ГПиМРМ`

## Структура Репозитория

- `books/various-muggles/` - активное рабочее пространство перевода антологии
- `books/various-muggles/source/` - исходные Markdown-сегменты, полученные из EPUB
- `books/various-muggles/output/` - переведенные Markdown-сегменты
- `books/various-muggles/assets/` - изображения и прочие локальные ресурсы
- `books/various-muggles/build/` - объединенный Markdown, HTML-превью и EPUB-превью
- `books/various-muggles/CODEX_TRANSLATION.md` - краткие инструкции для перевода
- `glossary/glossary.md` - каноническая терминология
- `glossary/style.md` - правила стиля и оформления
- `scripts/` - инструменты импорта, валидации, ревью и сборки
- `src/en/` - распакованный эталонный исходный EPUB
- `src/ru/` - legacy-источник на русском XHTML, который используется только
  для seed-данных и сравнения

## Требования

- Python `>=3.9`
- `uv` для управления зависимостями
- `bun` для онлайн-читалки в `site/`
- `pandoc` в `PATH`
- Calibre `ebook-convert` для генерации EPUB

`merge_and_build.py` ищет `ebook-convert` в `PATH`, в `$EBOOK_CONVERT`, а также
в типичных путях установки Calibre на macOS.

Установка Python-зависимостей:

```bash
uv sync
```

После `uv sync` скрипты можно запускать как `python3 scripts/...` без ручной
активации виртуального окружения.

## Онлайн-Читалка

Корень репозитория настроен так, чтобы Next.js-читалкой можно было управлять
прямо отсюда, хотя само приложение лежит в `site/`.

Основные команды:

```bash
bun dev
bun run sync-content
bun run lint
bun run typecheck
```

Команда `bun dev` из корня репозитория проксируется в приложение внутри `site/`
и запускает development server именно там.

## Быстрый Старт

### 1. Импортировать или обновить рабочее пространство антологии

```bash
python3 scripts/convert.py "The Book of HPMOR Fanfics - Various Muggles.epub" \
  --book-id various-muggles \
  --target-lang ru
```

Флаг `--refresh-src` принудительно заново распаковывает исходный EPUB в
`src/en/` перед пересборкой Markdown-рабочего пространства.

Команда пересоздает:

- `books/various-muggles/source/`
- `books/various-muggles/assets/`
- `books/various-muggles/config.json`
- `books/various-muggles/manifest.json`
- `books/various-muggles/CODEX_TRANSLATION.md`

Если в `src/ru/` есть соответствующие переведенные XHTML-файлы, импорт также
создаст seed-версии Markdown-файлов в `books/various-muggles/output/`.

### 2. Посмотреть, что еще требует работы

Сегменты без перевода:

```bash
python3 scripts/pending.py --book-id various-muggles
```

Сегменты, ожидающие ревью:

```bash
python3 scripts/pending.py --book-id various-muggles --review-pending
```

### 3. Перевести один сегмент

1. Прочитать `glossary/glossary.md` и `glossary/style.md`.
2. Открыть `books/various-muggles/CODEX_TRANSLATION.md`.
3. Выбрать файл из `books/various-muggles/source/`.
4. Записать русский перевод в файл с тем же именем в
   `books/various-muggles/output/`.

Важно:

- Сохранять структуру Markdown, ссылки, anchors и пути к ресурсам.
- Не переименовывать файлы.
- Не добавлять в перевод комментарии переводчика или служебные заметки.

### 4. Синхронизировать состояние и провалидировать его

```bash
python3 scripts/sync_manifest.py --book-id various-muggles
python3 scripts/validate_run.py --book-id various-muggles
```

Более строгие режимы:

- `python3 scripts/validate_run.py --book-id various-muggles --require-complete`
- `python3 scripts/validate_run.py --book-id various-muggles --require-reviewed`

### 5. Отметить сегменты как прошедшие ревью

Отметить конкретные сегменты:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --segment seg-0002 \
  --segment seg-0003
```

Отметить все переведенные сегменты:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --all-translated
```

При ревью можно также проставить версию глоссария:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --segment seg-0002 \
  --glossary-version potters-army+hpmorru-v1
```

### 6. Собрать превью-артефакты

Быстрый цикл для локального превью:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ" \
  --skip-epub
```

Полная сборка превью:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ"
```

Строгая release-like сборка:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ" \
  --require-complete \
  --require-reviewed
```

Артефакты сборки появляются в:

- `books/various-muggles/build/various-muggles-ru.md`
- `books/various-muggles/build/various-muggles-ru.html`
- `books/various-muggles/build/various-muggles-ru.epub`

По умолчанию builder берет переведенный сегмент, если он существует, и
подставляет исходный сегмент, если перевода еще нет. Благодаря этому HTML и
EPUB-превью можно собирать на любом этапе работы.

## Справка По Скриптам

- `scripts/convert.py` - импорт EPUB в Markdown-рабочее пространство
- `scripts/pending.py` - список сегментов без перевода или без ревью
- `scripts/sync_manifest.py` - синхронизация статусов manifest с файловой системой
- `scripts/validate_run.py` - валидация полноты и статуса ревью
- `scripts/review_segments.py` - обновление review-метаданных в manifest
- `scripts/merge_and_build.py` - объединение сегментов и сборка Markdown, HTML и EPUB
- `scripts/unpack_epub.py` - низкоуровневый helper для распаковки EPUB
- `scripts/validate_epub.py` - валидация распакованного дерева EPUB
- `scripts/build_epub.py` - низкоуровневый helper для сборки EPUB из распакованного дерева

## Рекомендованный Git-Ритм

- Коммиты с обновлением импортированного исходника держать отдельно от
  переводческих коммитов.
- Группировать перевод по одному рассказу или по одному связному батчу.
- Обновлять `glossary/glossary.md` до того, как вводится новый повторяющийся
  термин.
- Несовпадения с глоссарием считать блокером, даже если превью успешно
  собралось.

## Принципы Валидации

- Структурные проблемы, вроде отсутствующих source-файлов, устаревших хэшей
  или пустых translated output-файлов, считаются ошибками.
- Отсутствующие переводы явно репортятся и становятся блокирующими при
  `--require-complete`.
- Отсутствующее ревью становится блокирующим при `--require-reviewed`.
- Превью-сборки разрешены до полной готовности, чтобы форматирование и поток
  текста можно было проверять по ходу работы.
