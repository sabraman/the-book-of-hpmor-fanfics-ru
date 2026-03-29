#!/usr/bin/env python3

from __future__ import annotations

import argparse

from pipeline_common import (
    book_paths,
    detect_runtime_status,
    load_manifest,
    save_json,
    sync_manifest_translation_status,
)

VALID_REVIEW_STATUSES = ("unreviewed", "reviewed", "needs-work")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update review metadata for translated segments.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument(
        "--status",
        default="reviewed",
        choices=VALID_REVIEW_STATUSES,
        help="Review status to set.",
    )
    parser.add_argument(
        "--segment",
        action="append",
        default=[],
        help="Segment id to update. Repeat for multiple segments.",
    )
    parser.add_argument(
        "--story-id",
        action="append",
        default=[],
        help="Story id to update. Repeat for multiple stories.",
    )
    parser.add_argument(
        "--all-translated",
        action="store_true",
        help="Apply the review status to every translated segment.",
    )
    parser.add_argument(
        "--glossary-version",
        help="Optional glossary version tag to stamp on the selected segments.",
    )
    return parser.parse_args()


def matches(args: argparse.Namespace, segment: dict[str, str]) -> bool:
    if args.all_translated and segment.get("translation_status") == "translated":
        return True
    if args.segment and segment["id"] in set(args.segment):
        return True
    if args.story_id and segment.get("story_id") in set(args.story_id):
        return True
    return False


def main() -> int:
    args = parse_args()
    if not args.all_translated and not args.segment and not args.story_id:
        raise SystemExit("Select segments with --segment, --story-id, or --all-translated.")

    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)
    manifest, _ = sync_manifest_translation_status(manifest, runtime)

    updated = 0
    for segment in manifest["segments"]:
        if not matches(args, segment):
            continue
        if segment.get("translation_status") != "translated":
            continue
        segment["review_status"] = args.status
        if args.glossary_version:
            segment["glossary_version"] = args.glossary_version
        updated += 1

    save_json(book_paths(args.book_id)["manifest_path"], manifest)
    print(f"Book: {args.book_id}")
    print(f"Updated reviewed metadata on {updated} translated segment(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
