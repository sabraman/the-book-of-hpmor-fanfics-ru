#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from pipeline_common import (
    book_paths,
    detect_runtime_status,
    find_ebook_convert,
    load_config,
    load_manifest,
    run_command,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge translated markdown and build preview artifacts.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument("--title", required=True, help="Translated anthology title.")
    parser.add_argument("--author", default="Various Muggles", help="Output author metadata.")
    parser.add_argument(
        "--skip-epub",
        action="store_true",
        help="Only generate merged Markdown and HTML preview, skipping Calibre EPUB conversion.",
    )
    parser.add_argument(
        "--require-complete",
        action="store_true",
        help="Fail unless every segment has a translated output.",
    )
    parser.add_argument(
        "--require-reviewed",
        action="store_true",
        help="Fail unless every translated segment has review_status 'reviewed'.",
    )
    return parser.parse_args()


def rewrite_for_build(markdown: str) -> str:
    return markdown


def main() -> int:
    args = parse_args()
    config = load_config(args.book_id)
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)
    paths = book_paths(args.book_id)

    if runtime["errors"]:
        print("Cannot build due to structural errors:")
        for error in runtime["errors"][:50]:
            print(f"  - {error}")
        return 1

    if args.require_complete and runtime["pending_count"]:
        print("Cannot build a complete release: translated output is still missing.")
        return 1

    needs_review = [
        item
        for item in runtime["statuses"]
        if item["status"] == "translated" and item["segment"].get("review_status") != "reviewed"
    ]
    if args.require_reviewed and needs_review:
        print("Cannot build a reviewed release: some translated segments still need review.")
        for item in needs_review[:50]:
            segment = item["segment"]
            print(f"  - {segment['id']} [{segment.get('review_status', 'unreviewed')}] {segment['original_path']}")
        if len(needs_review) > 50:
            print(f"  - ... {len(needs_review) - 50} more")
        return 1

    merged_parts: list[str] = []
    for item in runtime["statuses"]:
        use_path = item["output_path"] if item["status"] == "translated" else item["source_path"]
        merged_parts.append(use_path.read_text(encoding="utf-8").strip())

    build_dir = paths["build_dir"]
    build_dir.mkdir(parents=True, exist_ok=True)
    build_assets_dir = build_dir / "assets"
    if build_assets_dir.exists():
        shutil.rmtree(build_assets_dir)
    shutil.copytree(paths["assets_dir"], build_assets_dir)

    output_md = build_dir / f"{args.book_id}-{config['target_lang']}.md"
    output_html = build_dir / f"{args.book_id}-{config['target_lang']}.html"
    output_epub = build_dir / f"{args.book_id}-{config['target_lang']}.epub"
    css_path = build_dir / "book.css"
    shutil.copy2(Path(__file__).with_name("book.css"), css_path)

    merged_markdown = rewrite_for_build("\n\n".join(part for part in merged_parts if part) + "\n")
    output_md.write_text(merged_markdown, encoding="utf-8")

    run_command(
        [
            "pandoc",
            str(output_md),
            "-o",
            str(output_html),
            "--standalone",
            "--toc",
            "--toc-depth=3",
            "--from",
            "gfm+raw_html",
            "--to",
            "html5",
            "--css",
            css_path.name,
            "--metadata",
            f"title={args.title}",
            "--metadata",
            f"lang={config['target_lang']}",
        ],
        cwd=build_dir,
    )

    print(f"Merged markdown: {output_md}")
    print(f"HTML preview: {output_html}")

    if args.skip_epub:
        print("Skipped EPUB conversion (--skip-epub).")
        return 0

    ebook_convert = find_ebook_convert()
    if not ebook_convert:
        raise SystemExit("ebook-convert not found. Point EBOOK_CONVERT to your Calibre installation.")

    cover_candidate = build_assets_dir / "cover.jpg"
    cmd = [
        ebook_convert,
        str(output_html),
        str(output_epub),
        "--title",
        args.title,
        "--authors",
        args.author,
        "--language",
        config["target_lang"],
    ]
    if cover_candidate.is_file():
        cmd.extend(["--cover", str(cover_candidate)])

    print(f"Using ebook-convert: {ebook_convert}")
    run_command(cmd, cwd=build_dir)

    print(f"EPUB preview: {output_epub}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
