#!/usr/bin/env python3

from __future__ import annotations

import argparse

from pipeline_common import detect_runtime_status, load_config, load_manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a markdown translation workspace.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
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


def main() -> int:
    args = parse_args()
    config = load_config(args.book_id)
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)

    print(f"Book: {config['book_id']}")
    print(f"Original title: {config['original_title']}")
    print(f"Translated title: {config['translated_title']}")
    print(f"Segments: {runtime['segment_count']}")

    for key in sorted(runtime["counts"]):
        print(f"{key}: {runtime['counts'][key]}")

    needs_review = [
        item
        for item in runtime["statuses"]
        if item["status"] == "translated" and item["segment"].get("review_status") != "reviewed"
    ]
    print(f"needs_review: {len(needs_review)}")

    if runtime["errors"]:
        print("Errors:")
        for error in runtime["errors"][:50]:
            print(f"  - {error}")
        if len(runtime["errors"]) > 50:
            print(f"  - ... {len(runtime['errors']) - 50} more")
        return 1

    if args.require_complete and runtime["pending_count"]:
        print("Workspace is structurally valid but translation is incomplete.")
        return 1

    if args.require_reviewed and needs_review:
        print("Workspace is translated structurally, but some translated segments still need review.")
        for item in needs_review[:50]:
            segment = item["segment"]
            print(f"  - {segment['id']} [{segment.get('review_status', 'unreviewed')}] {segment['original_path']}")
        if len(needs_review) > 50:
            print(f"  - ... {len(needs_review) - 50} more")
        return 1

    print("Workspace validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
