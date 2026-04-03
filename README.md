# The Book of HPMOR Fanfics RU

[Русская версия README](README.ru.md)

Russian translation workspace and build pipeline for *The Book of HPMOR Fanfics*.

The repository uses a markdown-first workflow: import the source EPUB into
segment-sized Markdown files, translate into `books/various-muggles/output/`,
validate the run state, and build preview artifacts from the mixed translated
and untranslated workspace.

## Translation Authorities

- Potter's Army is the naming authority for Harry Potter canon terms, places,
  spells, institutions, and recurring franchise vocabulary.
- ROSMEN alignment follows from Potter's Army canon choices.
- `hpmor.ru` is the authority for the Russian HPMOR title, chapter-title
  precedent, and established HPMOR-specific wording.
- Spivak is a prose-quality reference, not a naming authority.

Repo-facing title conventions:

- Full title: `Гарри Поттер и методы рационального мышления`
- Short form: `ГПиМРМ`

## Repository Layout

- `books/various-muggles/` - active translation workspace for this anthology
- `books/various-muggles/source/` - source Markdown segments generated from the EPUB
- `books/various-muggles/output/` - translated Markdown segments
- `books/various-muggles/assets/` - copied images and local assets
- `books/various-muggles/build/` - merged Markdown, HTML preview, and EPUB preview
- `books/various-muggles/CODEX_TRANSLATION.md` - concise translator instructions
- `glossary/glossary.md` - canonical terminology
- `glossary/style.md` - prose and formatting rules
- `scripts/` - import, validation, review, and build tools
- `src/en/` - unpacked reference EPUB source
- `src/ru/` - legacy Russian XHTML reference used only for seeding and comparison

## Requirements

- Python `>=3.9`
- `uv` for dependency management
- `bun` for the online reader app in `site/`
- `pandoc` in `PATH`
- Calibre's `ebook-convert` for EPUB output

`merge_and_build.py` will look for `ebook-convert` in `PATH`, in
`$EBOOK_CONVERT`, and in common macOS Calibre install locations.

Install Python dependencies once:

```bash
uv sync
```

The scripts bootstrap local dependencies automatically, so `python3 scripts/...`
works after `uv sync` without activating the virtual environment manually.

## Online Reader

The repository root is configured so the Next.js reader can be driven directly
from here even though the app lives in `site/`.

Common commands:

```bash
bun dev
bun run sync-content
bun run lint
bun run typecheck
```

`bun dev` at the repository root forwards to the app in `site/` and starts the
reader development server there.

## Quick Start

### 1. Import or refresh the anthology workspace

```bash
python3 scripts/convert.py "The Book of HPMOR Fanfics - Various Muggles.epub" \
  --book-id various-muggles \
  --target-lang ru
```

Use `--refresh-src` when you want to re-extract the source EPUB into `src/en/`
before rebuilding the Markdown workspace.

This command regenerates:

- `books/various-muggles/source/`
- `books/various-muggles/assets/`
- `books/various-muggles/config.json`
- `books/various-muggles/manifest.json`
- `books/various-muggles/CODEX_TRANSLATION.md`

If matching translated XHTML exists in `src/ru/`, the importer seeds the
corresponding Markdown files into `books/various-muggles/output/`.

### 2. Find work that still needs attention

Pending translation:

```bash
python3 scripts/pending.py --book-id various-muggles
```

Pending review:

```bash
python3 scripts/pending.py --book-id various-muggles --review-pending
```

### 3. Translate one segment

1. Read `glossary/glossary.md` and `glossary/style.md`.
2. Open `books/various-muggles/CODEX_TRANSLATION.md`.
3. Pick a file from `books/various-muggles/source/`.
4. Write the Russian translation to the matching filename under
   `books/various-muggles/output/`.
5. If this is the first translated segment of a new story, add the story's
   Russian book title to `books/various-muggles/config.json` under
   `translated_story_titles` before syncing reader content.

Important constraints:

- Keep Markdown structure, links, anchors, and asset paths intact.
- Do not rename files.
- Do not insert translator notes into the output.
- `bun run sync-content` will fail if a readable story still lacks a Russian
  book title in `books/various-muggles/config.json`.

For automation runs in detached worktrees, do not manually pick the first
`pending` segment. Use the shared claim helper instead:

```bash
python3 scripts/automation_claim.py show \
  --book-id various-muggles \
  --automation-id hourly-segment \
  --shared-root /Users/sabraman/sandbox/the-book-of-hpmor-fanfics-ru \
  --json
```

Only when `show` returns `no-active-claim`, acquire a new lease:

```bash
python3 scripts/automation_claim.py claim \
  --book-id various-muggles \
  --automation-id hourly-segment \
  --shared-root /Users/sabraman/sandbox/the-book-of-hpmor-fanfics-ru \
  --worktree-root "$PWD" \
  --json
```

It skips non-reader packaging pages like `cover.xhtml`, `titlepage.xhtml`,
`toc.xhtml`, and similar frontmatter-only segments. It also auto-clears empty
stale claims and auto-reconciles a claim if the old worktree only changed one
different segment file.

For automation, publish locally only:

```bash
python3 scripts/publish_from_worktree.py \
  --book-id various-muggles \
  --segment-id <claimed segment id> \
  --source-root "$PWD" \
  --publisher-root /Users/sabraman/sandbox/the-book-of-hpmor-fanfics-ru \
  --shared-root /Users/sabraman/sandbox/the-book-of-hpmor-fanfics-ru \
  --automation-id hourly-segment \
  --skip-push
```

This commits in the canonical checkout and clears the claim, but leaves
`git push` for a manual step outside automation.

### 4. Sync runtime state and validate

```bash
python3 scripts/sync_manifest.py --book-id various-muggles
python3 scripts/validate_run.py --book-id various-muggles
```

Useful stricter modes:

- `python3 scripts/validate_run.py --book-id various-muggles --require-complete`
- `python3 scripts/validate_run.py --book-id various-muggles --require-reviewed`

### 5. Mark reviewed segments

Mark specific segments:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --segment seg-0002 \
  --segment seg-0003
```

Mark all translated segments:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --all-translated
```

You can also stamp a glossary version during review:

```bash
python3 scripts/review_segments.py \
  --book-id various-muggles \
  --segment seg-0002 \
  --glossary-version potters-army+hpmorru-v1
```

### 6. Build preview artifacts

Fast preview loop:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ" \
  --skip-epub
```

Full preview build:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ"
```

Strict release-style build:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ" \
  --require-complete \
  --require-reviewed
```

Build outputs land in:

- `books/various-muggles/build/various-muggles-ru.md`
- `books/various-muggles/build/various-muggles-ru.html`
- `books/various-muggles/build/various-muggles-ru.epub`

By default the builder uses translated output when it exists and falls back to
the source segment when it does not. That keeps HTML and EPUB previews usable
throughout an incomplete translation run.

## Script Reference

- `scripts/convert.py` - import the EPUB into the Markdown workspace
- `scripts/pending.py` - list pending translation or review work
- `scripts/automation_claim.py` - claim the next automation-safe reader segment
- `scripts/push_pending_main.py` - manually push pending local `main` commits when desired
- `scripts/publish_from_worktree.py` - publish a validated worktree translation through the canonical checkout, either as a local-only commit (`--skip-push`) or with an immediate push
- `scripts/sync_manifest.py` - refresh manifest status from the filesystem
- `scripts/validate_run.py` - validate workspace completeness and review state
- `scripts/review_segments.py` - update review metadata in the manifest
- `scripts/merge_and_build.py` - merge segments and build Markdown, HTML, and EPUB previews
- `scripts/unpack_epub.py` - low-level EPUB extraction helper
- `scripts/validate_epub.py` - validate an unpacked EPUB tree directly
- `scripts/build_epub.py` - low-level EPUB build helper for unpacked trees

## Suggested Git Rhythm

- Commit source-import refreshes separately from translation work.
- Keep translation commits scoped to one story or one coherent batch.
- Update `glossary/glossary.md` before introducing a new recurring term.
- Treat glossary mismatches as blockers even if a preview build succeeds.

## Validation Philosophy

- Structural problems such as missing source files, stale hashes, or empty
  translated outputs are errors.
- Missing translations are reported clearly and become blocking with
  `--require-complete`.
- Missing review completion becomes blocking with `--require-reviewed`.
- Preview builds are allowed before full completion so translators can check
  formatting and flow continuously.
