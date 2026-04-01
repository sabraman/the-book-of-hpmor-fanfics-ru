#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re

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


def meaningful_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    for raw_block in re.split(r"\n\s*\n", text.replace("\r\n", "\n")):
        block = raw_block.strip()
        if not block or block == "</div>":
            continue
        if re.fullmatch(r"[-*/\\.\s]{8,}", block):
            continue
        blocks.append(block)
    return blocks


def compressed_length(text: str) -> int:
    compact = re.sub(r"\s+", "", text)
    compact = compact.replace("</div>", "")
    return len(compact)


def detect_suspected_truncations(
    config: dict[str, object], runtime: dict[str, object]
) -> list[str]:
    allowlist = set(config.get("truncation_allowlist", []))
    errors: list[str] = []

    for item in runtime["statuses"]:
        if item["status"] != "translated":
            continue

        segment = item["segment"]
        if segment["id"] in allowlist:
            continue

        source_text = item["source_path"].read_text(encoding="utf-8")
        output_text = item["output_path"].read_text(encoding="utf-8")
        source_blocks = meaningful_blocks(source_text)
        output_blocks = meaningful_blocks(output_text)

        if len(source_blocks) < 120:
            continue

        block_ratio = len(output_blocks) / len(source_blocks)
        char_ratio = compressed_length(output_text) / compressed_length(source_text)

        if block_ratio < 0.75 and char_ratio < 0.8:
            errors.append(
                f"{segment['id']}: output may be truncated "
                f"({len(output_blocks)}/{len(source_blocks)} blocks, {char_ratio:.0%} size ratio). "
                "If intentional, add the segment id to truncation_allowlist in books/various-muggles/config.json."
            )

    return errors


def main() -> int:
    args = parse_args()
    config = load_config(args.book_id)
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)
    truncation_errors = detect_suspected_truncations(config, runtime)

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

    all_errors = [*runtime["errors"], *truncation_errors]

    if all_errors:
        print("Errors:")
        for error in all_errors[:50]:
            print(f"  - {error}")
        if len(all_errors) > 50:
            print(f"  - ... {len(all_errors) - 50} more")
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
