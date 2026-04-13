#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
from typing import Any

from pipeline_common import is_reader_segment


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect anthology stories that became release-ready between two git refs."
    )
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument("--base-ref", required=True, help="Older git ref to compare from.")
    parser.add_argument("--head-ref", default="HEAD", help="Newer git ref to compare to.")
    parser.add_argument(
        "--require-reviewed",
        action="store_true",
        help="Require story reader segments to be marked reviewed in the target ref.",
    )
    parser.add_argument(
        "--include-changed-ready",
        action="store_true",
        help="Also include stories that were already ready but changed between refs.",
    )
    parser.add_argument("--json", action="store_true", help="Print structured JSON output.")
    return parser.parse_args()


def git_show_text(ref: str, path: str) -> str:
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise FileNotFoundError(path)
    return result.stdout


def git_path_exists(ref: str, path: str) -> bool:
    result = subprocess.run(
        ["git", "cat-file", "-e", f"{ref}:{path}"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def git_changed_paths(base_ref: str, head_ref: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", base_ref, head_ref],
        capture_output=True,
        text=True,
        check=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def load_json_at_ref(ref: str, path: str) -> dict[str, Any]:
    return json.loads(git_show_text(ref, path))


def all_story_ids(manifest: dict[str, Any]) -> list[str]:
    seen: set[str] = set()
    story_ids: list[str] = []
    for segment in manifest["segments"]:
        story_id = segment.get("story_id")
        if not story_id or story_id == "frontmatter" or story_id in seen:
            continue
        seen.add(story_id)
        story_ids.append(story_id)
    return story_ids


def title_fallback(manifest: dict[str, Any], story_id: str) -> str | None:
    for segment in manifest["segments"]:
        if segment.get("story_id") == story_id and segment.get("title") and segment["title"] != "Cover":
            return segment["title"]
    return None


def story_info_at_ref(
    ref: str,
    book_id: str,
    manifest: dict[str, Any],
    config: dict[str, Any],
    story_id: str,
    require_reviewed: bool,
) -> dict[str, Any]:
    reader_segments = [
        segment
        for segment in manifest["segments"]
        if segment.get("story_id") == story_id and is_reader_segment(segment["original_path"])
    ]
    translated_segments = [
        segment
        for segment in reader_segments
        if git_path_exists(ref, f"books/{book_id}/{segment['output_file']}")
    ]
    pending_segments = [
        segment["id"] for segment in reader_segments if segment not in translated_segments
    ]
    unreviewed_segments = [
        segment["id"]
        for segment in translated_segments
        if segment.get("review_status") != "reviewed"
    ]
    story_title = config.get("translated_story_titles", {}).get(story_id) or title_fallback(manifest, story_id)
    ready = bool(reader_segments) and not pending_segments and bool(story_title)
    if require_reviewed and unreviewed_segments:
        ready = False

    return {
        "ref": ref,
        "story_id": story_id,
        "story_title": story_title,
        "segment_count": len(reader_segments),
        "translated_count": len(translated_segments),
        "pending_segment_ids": pending_segments,
        "unreviewed_segment_ids": unreviewed_segments,
        "ready": ready,
    }


def main() -> int:
    args = parse_args()
    manifest_path = f"books/{args.book_id}/manifest.json"
    config_path = f"books/{args.book_id}/config.json"

    base_manifest = load_json_at_ref(args.base_ref, manifest_path)
    base_config = load_json_at_ref(args.base_ref, config_path)
    head_manifest = load_json_at_ref(args.head_ref, manifest_path)
    head_config = load_json_at_ref(args.head_ref, config_path)

    story_ids = all_story_ids(head_manifest)
    base_by_story = {
        story_id: story_info_at_ref(
            args.base_ref,
            args.book_id,
            base_manifest,
            base_config,
            story_id,
            args.require_reviewed,
        )
        for story_id in story_ids
    }
    head_by_story = {
        story_id: story_info_at_ref(
            args.head_ref,
            args.book_id,
            head_manifest,
            head_config,
            story_id,
            args.require_reviewed,
        )
        for story_id in story_ids
    }

    newly_ready = [
        head_by_story[story_id]
        for story_id in story_ids
        if head_by_story[story_id]["ready"] and not base_by_story.get(story_id, {}).get("ready", False)
    ]

    changed_ready: list[dict[str, Any]] = []
    if args.include_changed_ready:
        changed_paths = set(git_changed_paths(args.base_ref, args.head_ref))
        for story_id in story_ids:
            if not head_by_story[story_id]["ready"]:
                continue
            if not base_by_story.get(story_id, {}).get("ready", False):
                continue

            story_segments = [
                segment
                for segment in head_manifest["segments"]
                if segment.get("story_id") == story_id
            ]
            story_files = {
                f"books/{args.book_id}/{segment['output_file']}"
                for segment in story_segments
            }
            story_files.add(f"books/{args.book_id}/config.json")
            story_files.add("cover-hpmor-fanfics-ru.png")
            if changed_paths & story_files:
                changed_ready.append(head_by_story[story_id])

    selected_by_story_id = {item["story_id"]: item for item in [*newly_ready, *changed_ready]}
    selected = [selected_by_story_id[story_id] for story_id in story_ids if story_id in selected_by_story_id]

    payload = {
        "book_id": args.book_id,
        "base_ref": args.base_ref,
        "head_ref": args.head_ref,
        "require_reviewed": args.require_reviewed,
        "include_changed_ready": args.include_changed_ready,
        "newly_ready": newly_ready,
        "changed_ready": changed_ready,
        "selected": selected,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for item in selected:
            print(f"{item['story_id']}\t{item['story_title']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
