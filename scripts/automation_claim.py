#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

from pipeline_common import (
    automation_state_path,
    detect_runtime_status,
    is_reader_segment,
    load_json,
    load_manifest,
    save_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Claim or release translation work for automation.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    claim = subparsers.add_parser("claim", help="Claim the next eligible segment.")
    claim.add_argument("--book-id", required=True)
    claim.add_argument("--automation-id", required=True)
    claim.add_argument("--worktree-root", required=True)
    claim.add_argument("--lease-hours", type=int, default=12)
    claim.add_argument("--json", action="store_true")

    show = subparsers.add_parser("show", help="Show current claim state.")
    show.add_argument("--book-id", required=True)
    show.add_argument("--automation-id", required=True)
    show.add_argument("--json", action="store_true")

    complete = subparsers.add_parser("complete", help="Clear an active claim after successful publish.")
    complete.add_argument("--book-id", required=True)
    complete.add_argument("--automation-id", required=True)
    complete.add_argument("--segment-id", required=True)

    release = subparsers.add_parser("release", help="Release an active claim manually.")
    release.add_argument("--book-id", required=True)
    release.add_argument("--automation-id", required=True)
    release.add_argument("--segment-id", required=True)
    release.add_argument("--reason", default="manual release")

    return parser.parse_args()


def load_state(book_id: str, automation_id: str) -> tuple[Path, dict[str, Any]]:
    path = automation_state_path(automation_id, book_id)
    state = load_json(path, default={}) or {}
    return path, state


def save_state(path: Path, state: dict[str, Any]) -> None:
    if state:
        save_json(path, state)
    elif path.exists():
        path.unlink()


def current_runtime(book_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = load_manifest(book_id)
    runtime = detect_runtime_status(book_id, manifest)
    return manifest, runtime


def active_claim_status(state: dict[str, Any], runtime: dict[str, Any]) -> dict[str, Any] | None:
    claim = state.get("active_claim")
    if not claim:
        return None

    segment_id = claim["segment_id"]
    runtime_item = next(
        (item for item in runtime["statuses"] if item["segment"]["id"] == segment_id),
        None,
    )
    if runtime_item and runtime_item["status"] == "translated":
        return None
    if claim.get("expires_at", 0) < time.time():
        return None
    return claim


def eligible_items(runtime: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in runtime["statuses"]:
        if item["status"] == "translated":
            continue
        if not is_reader_segment(item["segment"]["original_path"]):
            continue
        items.append(item)
    return items


def print_result(data: dict[str, Any], as_json: bool) -> None:
    if as_json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    for key, value in data.items():
        print(f"{key}: {value}")


def claim_segment(args: argparse.Namespace) -> int:
    path, state = load_state(args.book_id, args.automation_id)
    _manifest, runtime = current_runtime(args.book_id)
    existing = active_claim_status(state, runtime)
    if existing:
        print_result(
            {
                "result": "existing-claim",
                "segment_id": existing["segment_id"],
                "original_path": existing["original_path"],
                "output_file": existing["output_file"],
                "worktree_root": existing["worktree_root"],
                "claimed_at": existing["claimed_at"],
                "expires_at": existing["expires_at"],
            },
            args.json,
        )
        return 0

    state = {"history": state.get("history", [])}
    items = eligible_items(runtime)
    if not items:
        print_result({"result": "no-eligible-segments"}, args.json)
        save_state(path, state)
        return 0

    chosen = items[0]["segment"]
    now = int(time.time())
    claim = {
        "segment_id": chosen["id"],
        "original_path": chosen["original_path"],
        "output_file": chosen["output_file"],
        "worktree_root": str(Path(args.worktree_root).resolve()),
        "claimed_at": now,
        "expires_at": now + args.lease_hours * 3600,
    }
    state["active_claim"] = claim
    state["history"].append({"event": "claim", **claim})
    save_state(path, state)
    print_result({"result": "claimed", **claim}, args.json)
    return 0


def show_claim(args: argparse.Namespace) -> int:
    path, state = load_state(args.book_id, args.automation_id)
    _manifest, runtime = current_runtime(args.book_id)
    claim = active_claim_status(state, runtime)
    if not claim:
        print_result({"result": "no-active-claim", "state_path": str(path)}, args.json)
        return 0
    print_result({"result": "active-claim", "state_path": str(path), **claim}, args.json)
    return 0


def clear_claim(args: argparse.Namespace, event: str, reason: str | None = None) -> int:
    path, state = load_state(args.book_id, args.automation_id)
    claim = state.get("active_claim")
    if not claim or claim.get("segment_id") != args.segment_id:
        print(
            f"No matching active claim for {args.segment_id} in {path}",
        )
        return 1

    state.setdefault("history", []).append(
        {
            "event": event,
            "segment_id": args.segment_id,
            "timestamp": int(time.time()),
            "reason": reason,
        }
    )
    state.pop("active_claim", None)
    save_state(path, state)
    print(f"Cleared active claim for {args.segment_id}")
    return 0


def main() -> int:
    args = parse_args()
    if args.command == "claim":
        return claim_segment(args)
    if args.command == "show":
        return show_claim(args)
    if args.command == "complete":
        return clear_claim(args, "complete")
    if args.command == "release":
        return clear_claim(args, "release", args.reason)
    raise AssertionError(f"Unhandled command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
