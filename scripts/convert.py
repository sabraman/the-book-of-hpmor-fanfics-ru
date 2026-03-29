#!/usr/bin/env python3

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from _bootstrap import bootstrap_local_venv
from pipeline_common import (
    REPO_ROOT,
    anchor_id,
    book_paths,
    clean_markdown,
    copy_assets,
    ensure_book_dirs,
    extract_epub_to_dir,
    load_json,
    normalize_href,
    reset_dir,
    save_json,
    segment_filename,
    segment_id,
    sha256_file,
    source_book_title,
    story_id_from_href,
    top_level_spine,
)

bootstrap_local_venv()

from bs4 import BeautifulSoup  # type: ignore
import pypandoc  # type: ignore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import the anthology into an EPUB-aware markdown workspace."
    )
    parser.add_argument("input_epub", help="Path to the original EPUB file.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument("--target-lang", default="ru", help="Target language code.")
    parser.add_argument(
        "--refresh-src",
        action="store_true",
        help="Re-extract the input EPUB into src/en before importing.",
    )
    return parser.parse_args()


def ensure_reference_source(epub_path: Path, refresh_src: bool) -> Path:
    src_root = REPO_ROOT / "src" / "en"
    if refresh_src or not (src_root / "content.opf").is_file():
        extract_epub_to_dir(epub_path, src_root)
    return src_root


def convert_html_to_markdown(html_text: str) -> str:
    try:
        content = pypandoc.convert_text(
            html_text,
            "gfm",
            format="html",
            extra_args=["--wrap=none"],
        )
    except RuntimeError:
        with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as tmp:
            tmp.write(html_text)
            temp_name = tmp.name
        content = pypandoc.convert_file(
            temp_name,
            "gfm",
            format="html",
            extra_args=["--wrap=none"],
        )
        Path(temp_name).unlink(missing_ok=True)
    return clean_markdown(content)


def rewrite_local_reference(
    raw_value: str,
    current_href: str,
    current_seg_id: str,
    segment_lookup: dict[str, str],
    src_root: Path,
) -> str:
    parts = urlsplit(raw_value)
    if parts.scheme or parts.netloc:
        return raw_value

    if not parts.path and parts.fragment:
        return f"#{anchor_id(current_seg_id, parts.fragment)}"

    normalized_path = normalize_href(current_href, parts.path or "")
    if normalized_path in segment_lookup:
        target_seg = segment_lookup[normalized_path]
        if parts.fragment:
            return f"#{anchor_id(target_seg, parts.fragment)}"
        return f"#{anchor_id(target_seg)}"

    local_target = src_root / normalized_path
    if local_target.is_file():
        return f"assets/{normalized_path}"

    return raw_value


def soup_title(soup: BeautifulSoup) -> str:
    for selector in ("h1", "h2", "h3", "title"):
        tag = soup.find(selector)
        if tag and tag.get_text(strip=True):
            return tag.get_text(" ", strip=True)
    return ""


def prepare_html(
    html_text: str,
    src_root: Path,
    original_href: str,
    current_seg_id: str,
    segment_lookup: dict[str, str],
) -> tuple[str, str]:
    soup = BeautifulSoup(html_text, "html.parser")

    for tag in soup.find_all(["script", "style"]):
        tag.decompose()

    body = soup.body or soup
    root_anchor = soup.new_tag("a", id=anchor_id(current_seg_id))
    body.insert(0, root_anchor)

    for tag in body.find_all(True):
        for attr in ("id", "name"):
            value = tag.attrs.get(attr)
            if value:
                tag.attrs[attr] = anchor_id(current_seg_id, str(value))

    for tag in body.find_all(True):
        for attr in ("href", "src"):
            value = tag.attrs.get(attr)
            if isinstance(value, str) and value:
                tag.attrs[attr] = rewrite_local_reference(
                    value, original_href, current_seg_id, segment_lookup, src_root
                )

    return str(soup), soup_title(soup)


def import_segment(
    source_root: Path,
    href: str,
    seg_id: str,
    segment_lookup: dict[str, str],
) -> tuple[str, str]:
    html_path = source_root / href
    html_text = html_path.read_text(encoding="utf-8")
    prepared_html, title = prepare_html(html_text, source_root, href, seg_id, segment_lookup)
    markdown = convert_html_to_markdown(prepared_html)
    return markdown, title


def seed_translated_segment(
    ru_root: Path,
    en_root: Path,
    href: str,
    seg_id: str,
    segment_lookup: dict[str, str],
) -> str | None:
    ru_path = ru_root / href
    en_path = en_root / href
    if not ru_path.is_file() or not en_path.is_file():
        return None
    if ru_path.read_text(encoding="utf-8") == en_path.read_text(encoding="utf-8"):
        return None
    html_text = ru_path.read_text(encoding="utf-8")
    prepared_html, _ = prepare_html(html_text, ru_root, href, seg_id, segment_lookup)
    return convert_html_to_markdown(prepared_html)


def write_prompt(book_id: str) -> None:
    paths = book_paths(book_id)
    prompt = """# Codex Translation Workflow

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
5. Run:

```bash
python3 scripts/sync_manifest.py --book-id various-muggles
python3 scripts/validate_run.py --book-id various-muggles
```

6. Build a preview when useful:

```bash
python3 scripts/merge_and_build.py --book-id various-muggles --title "Книга фанфиков ГПиМРМ" --skip-epub
```
"""
    paths["prompt_path"].write_text(prompt, encoding="utf-8")


def main() -> int:
    args = parse_args()
    input_epub = Path(args.input_epub).resolve()
    if not input_epub.is_file():
        raise SystemExit(f"Input EPUB not found: {input_epub}")

    source_root = ensure_reference_source(input_epub, args.refresh_src)
    ru_root = REPO_ROOT / "src" / "ru"
    paths = ensure_book_dirs(args.book_id)

    reset_dir(paths["source_dir"])
    reset_dir(paths["assets_dir"])
    copied_assets = copy_assets(source_root, paths["assets_dir"])

    spine = top_level_spine(source_root)
    segment_lookup = {href: segment_id(order) for order, href in enumerate(spine, start=1)}

    segments = []
    seeded = 0
    for order, href in enumerate(spine, start=1):
        seg_id = segment_id(order)
        source_markdown, title = import_segment(source_root, href, seg_id, segment_lookup)

        source_name = segment_filename(order)
        output_name = segment_filename(order)
        source_file = paths["source_dir"] / source_name
        source_file.write_text(source_markdown, encoding="utf-8")

        translation_status = "pending"
        translated_markdown = seed_translated_segment(ru_root, source_root, href, seg_id, segment_lookup)
        if translated_markdown:
            output_file = paths["output_dir"] / output_name
            output_file.write_text(translated_markdown, encoding="utf-8")
            translation_status = "seeded"
            seeded += 1

        segments.append(
            {
                "id": seg_id,
                "order": order,
                "story_id": story_id_from_href(href),
                "original_path": href,
                "source_file": f"source/{source_name}",
                "source_hash": sha256_file(source_file),
                "output_file": f"output/{output_name}",
                "translation_status": translation_status,
                "review_status": "unreviewed",
                "glossary_version": "potters-army+hpmorru-v1",
                "title": title,
            }
        )

    config = {
        "book_id": args.book_id,
        "target_lang": args.target_lang,
        "input_epub": str(input_epub),
        "input_hash": sha256_file(input_epub),
        "source_root": "src/en",
        "legacy_ru_root": "src/ru",
        "original_title": source_book_title(source_root),
        "translated_title": "Книга фанфиков ГПиМРМ",
        "glossary_short_form": "ГПиМРМ",
        "glossary_full_title": "Гарри Поттер и методы рационального мышления",
        "segment_count": len(segments),
        "asset_count": copied_assets,
    }
    manifest = {
        "book_id": args.book_id,
        "segment_count": len(segments),
        "segments": segments,
    }

    save_json(paths["config_path"], config)
    save_json(paths["manifest_path"], manifest)
    write_prompt(args.book_id)

    print(f"Imported {len(segments)} markdown segments for {args.book_id}")
    print(f"Copied {copied_assets} assets into {paths['assets_dir']}")
    print(f"Seeded {seeded} translated segment(s) from src/ru")
    print(f"Manifest: {paths['manifest_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
