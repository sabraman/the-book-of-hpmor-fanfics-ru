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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync manifest translation_status fields from runtime state.")
    parser.add_argument("--book-id", required=True, help="Workspace identifier.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)
    manifest, updated = sync_manifest_translation_status(manifest, runtime)
    save_json(book_paths(args.book_id)["manifest_path"], manifest)

    print(f"Book: {args.book_id}")
    print(f"Segments: {runtime['segment_count']}")
    print(f"Updated manifest statuses: {updated}")
    for key in sorted(runtime["counts"]):
        print(f"{key}: {runtime['counts'][key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
