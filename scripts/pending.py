#!/usr/bin/env python3

from __future__ import annotations

import argparse

from pipeline_common import detect_runtime_status, load_manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List pending or stale translation segments.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    parser.add_argument("--limit", type=int, default=25, help="Maximum rows to print.")
    parser.add_argument(
        "--review-pending",
        action="store_true",
        help="List translated segments whose review_status is not 'reviewed'.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)

    print(f"Segments: {runtime['segment_count']}")
    print(f"Translated: {runtime['translated_count']}")
    print(f"Pending: {runtime['pending_count']}")
    needs_review = [
        item
        for item in runtime["statuses"]
        if item["status"] == "translated" and item["segment"].get("review_status") != "reviewed"
    ]
    print(f"Needs review: {len(needs_review)}")

    if args.review_pending:
        interesting = needs_review
    else:
        interesting = [
            item
            for item in runtime["statuses"]
            if item["status"] != "translated"
        ]
    if not interesting:
        if args.review_pending:
            print("No translated segments are waiting for review.")
        else:
            print("No pending or stale segments.")
        return 0

    if args.review_pending:
        print("Segments waiting for review:")
    else:
        print("Outstanding segments:")
    for item in interesting[: args.limit]:
        segment = item["segment"]
        status = item["status"] if not args.review_pending else segment.get("review_status", "unreviewed")
        print(f"  - {segment['id']} [{status}] {segment['original_path']} -> {segment['output_file']}")
    if len(interesting) > args.limit:
        print(f"  - ... {len(interesting) - args.limit} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
