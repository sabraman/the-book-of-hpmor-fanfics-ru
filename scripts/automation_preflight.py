#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

from pipeline_common import detect_runtime_status, load_config, load_manifest
from validate_run import find_suspected_truncations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect the translation workspace before automation claims new work."
    )
    parser.add_argument("--book-id", required=True)
    parser.add_argument(
        "--repo-root",
        help="Inspect a specific checkout instead of the current script checkout.",
    )
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON.")
    return parser.parse_args()


def collect_dirty_translation_state(repo_root: Path, book_id: str) -> dict[str, list[str]]:
    watched = [
        f"books/{book_id}/output",
        f"books/{book_id}/manifest.json",
        f"books/{book_id}/config.json",
        "glossary/glossary.md",
        "site/src/content/chapters",
        "site/public/book-assets",
        "site/src/lib/generated/catalog.ts",
    ]
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "--untracked-files=all", "--", *watched],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "git status failed"
        raise RuntimeError(message)

    dirty_paths: list[str] = []
    output_segment_ids: list[str] = []
    reader_segment_ids: list[str] = []
    output_pattern = re.compile(rf"^books/{re.escape(book_id)}/output/segment(\d{{4}})\.md$")
    reader_pattern = re.compile(r"^site/src/content/chapters/seg-(\d{4})\.mdx$")

    for raw_line in result.stdout.splitlines():
        if not raw_line.strip():
            continue
        path = raw_line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        dirty_paths.append(path)
        output_match = output_pattern.match(path)
        if output_match:
            output_segment_ids.append(f"seg-{output_match.group(1)}")
            continue
        reader_match = reader_pattern.match(path)
        if reader_match:
            reader_segment_ids.append(f"seg-{reader_match.group(1)}")

    return {
        "dirty_paths": sorted(dict.fromkeys(dirty_paths)),
        "output_segment_ids": sorted(dict.fromkeys(output_segment_ids)),
        "reader_segment_ids": sorted(dict.fromkeys(reader_segment_ids)),
    }


def extract_missing_story_title(stderr: str) -> str | None:
    match = re.search(r"Missing translated story title for (story-\d+)", stderr)
    if match:
        return match.group(1)
    return None


def is_generated_only_dirty(state: dict[str, list[str]], book_id: str) -> bool:
    dirty_paths = state["dirty_paths"]
    if not dirty_paths:
        return False
    if state["output_segment_ids"]:
        return False

    allowed_exact = {
        f"books/{book_id}/manifest.json",
        "site/src/lib/generated/catalog.ts",
    }
    allowed_prefixes = (
        "site/src/content/chapters/",
        "site/public/book-assets/",
    )
    blocked_exact = {
        f"books/{book_id}/config.json",
        "glossary/glossary.md",
    }

    for path in dirty_paths:
        if path in blocked_exact:
            return False
        if path in allowed_exact:
            continue
        if any(path.startswith(prefix) for prefix in allowed_prefixes):
            continue
        return False
    return True


def run_checked(cmd: list[str], cwd: Path) -> tuple[bool, str]:
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode == 0:
        return True, result.stdout.strip()
    return False, result.stderr.strip() or result.stdout.strip() or "Command failed"


def attempt_generated_state_repair(repo_root: Path, book_id: str) -> dict[str, object]:
    ok, message = run_checked(
        ["python3", "scripts/sync_manifest.py", "--book-id", book_id],
        cwd=repo_root,
    )
    if not ok:
        return {
            "result": "blocker",
            "errors": [f"Automatic manifest repair failed: {message}"],
        }

    ok, message = run_checked(
        ["python3", "scripts/validate_run.py", "--book-id", book_id],
        cwd=repo_root,
    )
    if not ok:
        return {
            "result": "blocker",
            "errors": [f"Automatic validation failed: {message}"],
        }

    ok, message = run_checked(["bun", "run", "sync-content"], cwd=repo_root / "site")
    if ok:
        return {
            "result": "ok",
            "auto_repaired_generated_state": True,
        }

    story_id = extract_missing_story_title(message)
    if story_id:
        return {
            "result": "repair-missing-story-title",
            "story_id": story_id,
            "errors": [message],
        }

    return {
        "result": "blocker",
        "errors": [f"Automatic generated-state repair failed: {message}"],
    }


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else None
    config = load_config(args.book_id, repo_root=repo_root)
    manifest = load_manifest(args.book_id, repo_root=repo_root)
    runtime = detect_runtime_status(args.book_id, manifest, repo_root=repo_root)

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
            dirty_state = collect_dirty_translation_state(
                repo_root or Path(__file__).resolve().parents[1], args.book_id
            )
            if is_generated_only_dirty(dirty_state, args.book_id):
                payload.update(
                    attempt_generated_state_repair(
                        repo_root or Path(__file__).resolve().parents[1],
                        args.book_id,
                    )
                )
            elif len(dirty_state["output_segment_ids"]) == 1:
                payload.update(
                    {
                        "result": "repair-local-publish",
                        "segment_id": dirty_state["output_segment_ids"][0],
                        "dirty_paths": dirty_state["dirty_paths"],
                        "dirty_segment_ids": dirty_state["output_segment_ids"],
                        "dirty_reader_segment_ids": dirty_state["reader_segment_ids"],
                    }
                )
            elif dirty_state["output_segment_ids"]:
                payload.update(
                    {
                        "result": "blocker",
                        "errors": [
                            "Canonical checkout has unfinished local publish state for multiple segments: "
                            + ", ".join(dirty_state["output_segment_ids"])
                        ],
                        "dirty_paths": dirty_state["dirty_paths"],
                        "dirty_segment_ids": dirty_state["output_segment_ids"],
                        "dirty_reader_segment_ids": dirty_state["reader_segment_ids"],
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
