# The Book of HPMOR Fanfics RU Pipeline

This repository now uses a markdown-first translation pipeline inspired by
`deusyu/translate-book`, but adapted for Codex, Russian output, and this
anthology's EPUB structure.

## Translation Authorities

- Potter's Army is the primary source for Harry Potter canon names, places,
  spells, institutions, and recurring franchise terminology.
- ROSMEN alignment is assumed through Potter's Army canon choices.
- `hpmor.ru` is the authority for the Russian HPMOR title, chapter-title
  precedent, and established HPMOR-specific wording.
- Spivak is a prose-quality reference for precision and naturalness, not a
  naming authority.

Repo-facing title conventions:

- Full title: `Гарри Поттер и методы рационального мышления`
- Short form: `ГПиМРМ`

## Layout

- `src/en/` - read-only unpacked reference copy of the original EPUB
- `src/ru/` - legacy XHTML translation reference; no longer the primary source
- `books/various-muggles/` - active markdown workspace for this anthology
- `glossary/` - canonical terminology and style rules
- `scripts/` - import, manifest, validation, and build pipeline

## Tooling

- `pandoc` must be installed and available in `PATH`
- Calibre's `ebook-convert` is used for EPUB generation
  The pipeline will use an existing Calibre app install such as
  `/Applications/calibre.app/Contents/MacOS/ebook-convert` even if
  `ebook-convert` is not on `PATH`.
- Python dependencies are managed with `uv`

Bootstrap once:

```bash
uv sync
```

The scripts are written so `python3 scripts/...` works after `uv sync` without
manually activating the virtual environment.

## Main Workflow

### 1. Import or refresh the anthology workspace

```bash
python3 scripts/convert.py "The Book of HPMOR Fanfics - Various Muggles.epub" \
  --book-id various-muggles \
  --target-lang ru
```

This creates or refreshes:

- `books/various-muggles/source/` - ordered source markdown segments
- `books/various-muggles/output/` - translated markdown segments
- `books/various-muggles/assets/` - copied images and other local assets
- `books/various-muggles/config.json`
- `books/various-muggles/manifest.json`

It also migrates the already translated Russian top-level front matter from
`src/ru/` into the markdown output workspace.

### 2. See what still needs translation

```bash
python3 scripts/pending.py --book-id various-muggles
```

### 3. Translate one segment

Use the instructions in:

- `books/various-muggles/CODEX_TRANSLATION.md`

Write the result to the paired file under `books/various-muggles/output/`.

### 4. Validate the run state

```bash
python3 scripts/sync_manifest.py --book-id various-muggles
python3 scripts/validate_run.py --book-id various-muggles
```

Use `--require-complete` when you want validation to fail unless every segment
has a translated output.

Use `--require-reviewed` when you want validation to fail unless every
translated segment has already been marked as reviewed.

To mark translated segments as reviewed after QA:

```bash
python3 scripts/review_segments.py --book-id various-muggles --segment seg-0002 --segment seg-0003
```

### 5. Build preview artifacts

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ"
```

By default the builder uses translated output segments when present and falls
back to source segments when a translation is still missing. That keeps preview
builds possible throughout the project.

For a fast day-to-day preview loop that skips the slower Calibre pass:

```bash
python3 scripts/merge_and_build.py \
  --book-id various-muggles \
  --title "Книга фанфиков ГПиМРМ" \
  --skip-epub
```

Use `--require-complete` for a fully translated release build.
Use `--require-reviewed` when you want the release build to enforce review
completion on every translated segment.

## Git Rhythm

- Commit imported source/manifest changes separately from translation batches.
- Update `glossary/glossary.md` before introducing a new recurring term.
- Prefer one story or one coherent batch per commit.

## Validation Philosophy

- Structural issues such as missing source segments, stale hashes, or empty
  translated outputs are treated as errors.
- Missing translations are reported clearly and can be made blocking with
  `--require-complete`.
- Review completion can be made blocking with `--require-reviewed`.
- Glossary mismatches are a review blocker even if the build succeeds.
