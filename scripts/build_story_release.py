#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

from pipeline_common import (
    book_paths,
    detect_runtime_status,
    find_ebook_convert,
    is_reader_segment,
    load_config,
    load_manifest,
    run_command,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build release EPUBs for fully translated anthology stories."
    )
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument(
        "--story-id",
        help="Build a specific story. If omitted with --list-complete, only print completed stories.",
    )
    parser.add_argument(
        "--list-complete",
        action="store_true",
        help="Print story IDs that are ready for release.",
    )
    parser.add_argument(
        "--require-reviewed",
        action="store_true",
        help="Require every translated reader segment in the story to be reviewed.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print completion/build information as JSON.",
    )
    return parser.parse_args()


def story_release_filename(book_id: str, story_id: str, lang: str) -> str:
    return f"{book_id}-{story_id}-{lang}.epub"


def find_release_cover(paths: dict[ str, Path]) -> Path | None:
    repo_root = paths["book_dir"].parents[1]
    candidates = [
        repo_root / "cover-hpmor-fanfics-ru.png",
        paths["assets_dir"] / "cover.jpg",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def strip_non_cover_images(markdown: str) -> str:
    cleaned = markdown

    # Remove markdown image syntax entirely, including cover-svg wrappers imported from EPUB.
    cleaned = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", cleaned)
    # Remove raw image tags.
    cleaned = re.sub(r"<img\b[^>]*>", "", cleaned, flags=re.IGNORECASE)
    # Remove empty anchors left behind after image stripping.
    cleaned = re.sub(r"<a\b[^>]*>\s*</a>", "", cleaned, flags=re.IGNORECASE)
    # Remove empty div wrappers commonly used around cover images.
    cleaned = re.sub(r"<div>\s*</div>", "", cleaned, flags=re.IGNORECASE)
    # Collapse excessive blank lines introduced by stripping.
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip() + "\n"


def collect_story_segments(
    manifest: dict,
    runtime: dict,
    story_id: str,
) -> list[dict]:
    status_by_id = {item["segment"]["id"]: item for item in runtime["statuses"]}
    story_segments: list[dict] = []
    for segment in manifest["segments"]:
        if segment.get("story_id") != story_id:
            continue
        if not is_reader_segment(segment["original_path"]):
            continue
        story_segments.append(status_by_id[segment["id"]])
    return story_segments


def story_completion_info(
    config: dict,
    manifest: dict,
    runtime: dict,
    story_id: str,
    require_reviewed: bool,
) -> dict:
    story_segments = collect_story_segments(manifest, runtime, story_id)
    translated = [item for item in story_segments if item["status"] == "translated"]
    pending = [item for item in story_segments if item["status"] != "translated"]
    unreviewed = [
        item
        for item in translated
        if item["segment"].get("review_status") != "reviewed"
    ]
    story_title = config["translated_story_titles"].get(story_id)
    ready = bool(story_segments) and not pending and bool(story_title)
    if require_reviewed and unreviewed:
        ready = False

    return {
        "story_id": story_id,
        "story_title": story_title,
        "segment_count": len(story_segments),
        "translated_count": len(translated),
        "pending_segment_ids": [item["segment"]["id"] for item in pending],
        "unreviewed_segment_ids": [item["segment"]["id"] for item in unreviewed],
        "ready": ready,
    }


def all_story_ids(manifest: dict) -> list[str]:
    story_ids: list[str] = []
    seen: set[str] = set()
    for segment in manifest["segments"]:
        story_id = segment.get("story_id")
        if not story_id or story_id == "frontmatter" or story_id in seen:
            continue
        seen.add(story_id)
        story_ids.append(story_id)
    return story_ids


def build_story_release(
    book_id: str,
    story_id: str,
    config: dict,
    manifest: dict,
    runtime: dict,
    require_reviewed: bool,
) -> dict:
    info = story_completion_info(config, manifest, runtime, story_id, require_reviewed)
    if not info["ready"]:
        raise SystemExit(
            json.dumps(info, ensure_ascii=False, indent=2)
            if info
            else f"{story_id} is not ready for release."
        )

    paths = book_paths(book_id)
    story_segments = collect_story_segments(manifest, runtime, story_id)
    merged_parts = [
        strip_non_cover_images(item["output_path"].read_text(encoding="utf-8").strip())
        for item in story_segments
    ]

    release_root = paths["build_dir"] / "releases" / story_id
    release_root.mkdir(parents=True, exist_ok=True)

    output_md = release_root / f"{book_id}-{story_id}-{config['target_lang']}.md"
    output_html = release_root / f"{book_id}-{story_id}-{config['target_lang']}.html"
    output_epub = release_root / story_release_filename(book_id, story_id, config["target_lang"])
    css_path = release_root / "book.css"
    shutil.copy2(Path(__file__).with_name("book.css"), css_path)

    merged_markdown = "\n\n".join(part for part in merged_parts if part).strip() + "\n"
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
            f"title={info['story_title']}",
            "--metadata",
            f"lang={config['target_lang']}",
        ],
        cwd=release_root,
    )

    ebook_convert = find_ebook_convert()
    if not ebook_convert:
        raise SystemExit("ebook-convert not found. Point EBOOK_CONVERT to your Calibre installation.")

    cover_candidate = find_release_cover(paths)
    cmd = [
        ebook_convert,
        str(output_html),
        str(output_epub),
        "--title",
        info["story_title"],
        "--authors",
        "Various Muggles",
        "--language",
        config["target_lang"],
    ]
    if cover_candidate:
        cmd.extend(["--cover", str(cover_candidate)])

    run_command(cmd, cwd=release_root)

    metadata = {
        **info,
        "book_id": book_id,
        "collection_title": config["translated_title"],
        "output_md": str(output_md),
        "output_html": str(output_html),
        "output_epub": str(output_epub),
    }
    metadata_path = release_root / "release.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata["metadata_path"] = str(metadata_path)
    return metadata


def main() -> int:
    args = parse_args()
    config = load_config(args.book_id)
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)

    if runtime["errors"]:
        print("Cannot build story releases due to structural errors:")
        for error in runtime["errors"][:50]:
            print(f"  - {error}")
        return 1

    completion = [
        story_completion_info(config, manifest, runtime, story_id, args.require_reviewed)
        for story_id in all_story_ids(manifest)
    ]

    if args.list_complete and not args.story_id:
        ready = [item for item in completion if item["ready"]]
        if args.json:
            print(json.dumps(ready, ensure_ascii=False, indent=2))
        else:
            for item in ready:
                print(f"{item['story_id']}\t{item['story_title']}")
        return 0

    if not args.story_id:
        raise SystemExit("Pass --story-id to build a release, or use --list-complete.")

    metadata = build_story_release(
        args.book_id,
        args.story_id,
        config,
        manifest,
        runtime,
        args.require_reviewed,
    )
    if args.json:
        print(json.dumps(metadata, ensure_ascii=False, indent=2))
    else:
        print(f"Built story release EPUB: {metadata['output_epub']}")
        print(f"Story: {metadata['story_id']} {metadata['story_title']}")
        print(f"Metadata: {metadata['metadata_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
