# Codex Translation Workflow

Use this workflow when translating one markdown segment for this anthology.

## Rules

- Read `glossary/glossary.md` and `glossary/style.md` first.
- Potter's Army / ROSMEN canon naming wins for Harry Potter terms.
- `hpmor.ru` wins for the HPMOR Russian title and chapter-title precedent.
- Keep Markdown structure, links, anchors, image paths, and file names intact.
- Do not add commentary or notes into the output file.

## Segment Workflow

1. Find pending work:

```bash
python3 scripts/pending.py --book-id various-muggles
```

2. Open one source segment from `books/various-muggles/source/`.
3. Translate it into Russian.
4. Write the translated markdown to the matching path in
   `books/various-muggles/output/`.
5. If this is the first translated segment of a new story, add that story's
   Russian book title to `books/various-muggles/config.json` under
   `translated_story_titles`.
6. Run:

```bash
python3 scripts/sync_manifest.py --book-id various-muggles
python3 scripts/validate_run.py --book-id various-muggles
```

7. Build a preview when useful:

```bash
python3 scripts/merge_and_build.py --book-id various-muggles --title "Книга фанфиков ГПиМРМ" --skip-epub
```
