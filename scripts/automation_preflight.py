#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json

from pipeline_common import detect_runtime_status, load_config, load_manifest
from validate_run import find_suspected_truncations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect the translation workspace before automation claims new work."
    )
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_config(args.book_id)
    manifest = load_manifest(args.book_id)
    runtime = detect_runtime_status(args.book_id, manifest)

    payload: dict[str, object] = {
        "book_id": args.book_id,
        "counts": runtime["counts"],
    }

    if runtime["errors"]:
        payload.update(
            {
                "result": "blocker",
                "errors": runtime["errors"],
            }
        )
    else:
        truncations = find_suspected_truncations(config, runtime)
        if truncations:
            payload.update(
                {
                    "result": "repair-truncated",
                    "segment_id": truncations[0]["segment_id"],
                    "source_file": truncations[0]["source_file"],
                    "output_file": truncations[0]["output_file"],
                    "finding": truncations[0],
                    "all_findings": truncations,
                }
            )
        else:
            payload["result"] = "ok"

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload["result"])
        if payload["result"] == "repair-truncated":
            print(payload["segment_id"])
        elif payload["result"] == "blocker":
            for error in payload["errors"]:
                print(f"- {error}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
