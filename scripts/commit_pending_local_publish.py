#!/usr/bin/env python3

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from pipeline_common import load_manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Finalize a local-only automation publish already present in the canonical checkout."
    )
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--segment-id")
    parser.add_argument("--automation-id")
    parser.add_argument("--shared-root")
    parser.add_argument("--commit-message")
    return parser.parse_args()


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "Command failed"
        raise RuntimeError(f"{' '.join(cmd)}: {message}")
    return result


def has_staged_changes(repo_root: Path, paths: list[str]) -> bool:
    result = subprocess.run(
        ["git", "diff", "--cached", "--quiet", "--", *paths],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return False
    if result.returncode == 1:
        return True
    message = result.stderr.strip() or result.stdout.strip() or "Command failed"
    raise RuntimeError(f"git diff --cached --quiet -- {' '.join(paths)}: {message}")


def dirty_paths(repo_root: Path, book_id: str) -> list[str]:
    watched = [
        f"books/{book_id}/output",
        f"books/{book_id}/manifest.json",
        f"books/{book_id}/config.json",
        "glossary/glossary.md",
        "site/src/content/chapters",
        "site/src/lib/generated/catalog.ts",
    ]
    result = run(
        ["git", "status", "--porcelain=v1", "--untracked-files=all", "--", *watched],
        cwd=repo_root,
    )
    paths: list[str] = []
    for raw_line in result.stdout.splitlines():
        if not raw_line.strip():
            continue
        path = raw_line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path)
    return sorted(dict.fromkeys(paths))


def relevant_paths(book_id: str, segment_id: str | None) -> list[str]:
    paths = [
        f"books/{book_id}/manifest.json",
        f"books/{book_id}/config.json",
        "glossary/glossary.md",
        "site/src/lib/generated/catalog.ts",
    ]
    if segment_id:
        order = int(segment_id.split("-")[1])
        paths.extend(
            [
                f"books/{book_id}/output/segment{order:04d}.md",
                f"site/src/content/chapters/{segment_id}.mdx",
            ]
        )
    return paths


def maybe_clear_claim(
    repo_root: Path,
    book_id: str,
    automation_id: str | None,
    segment_id: str | None,
    shared_root: Path | None,
) -> None:
    if not automation_id or not segment_id:
        return
    cmd = [
        "python3",
        str(repo_root / "scripts" / "automation_claim.py"),
        "complete",
        "--book-id",
        book_id,
        "--automation-id",
        automation_id,
        "--segment-id",
        segment_id,
    ]
    if shared_root:
        cmd.extend(["--shared-root", str(shared_root)])
    run(cmd, cwd=repo_root)


def cleanup_completed_worktrees(
    repo_root: Path,
    book_id: str,
    automation_id: str | None,
    shared_root: Path | None,
) -> None:
    if not automation_id or not shared_root:
        return
    cmd = [
        "python3",
        str(repo_root / "scripts" / "cleanup_completed_worktrees.py"),
        "--repo-root",
        str(repo_root),
        "--book-id",
        book_id,
        "--automation-id",
        automation_id,
        "--shared-root",
        str(shared_root),
    ]
    run(cmd, cwd=repo_root)


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    shared_root = Path(args.shared_root).resolve() if args.shared_root else None

    run(["python3", "scripts/sync_manifest.py", "--book-id", args.book_id], cwd=repo_root)
    run(["python3", "scripts/validate_run.py", "--book-id", args.book_id], cwd=repo_root)
    run(["bun", "run", "sync-content"], cwd=repo_root / "site")

    dirty = dirty_paths(repo_root, args.book_id)
    paths = relevant_paths(args.book_id, args.segment_id)
    stage_paths = [path for path in paths if path in dirty]
    if not stage_paths:
        stage_paths = dirty

    if not stage_paths:
        maybe_clear_claim(repo_root, args.book_id, args.automation_id, args.segment_id, shared_root)
        print(f"No local publish changes to commit in {repo_root}")
        return 0

    run(["git", "add", "--", *stage_paths], cwd=repo_root)

    if has_staged_changes(repo_root, stage_paths):
        commit_message = args.commit_message
        if not commit_message and args.segment_id:
            manifest = load_manifest(args.book_id, repo_root=repo_root)
            segment = next(item for item in manifest["segments"] if item["id"] == args.segment_id)
            commit_message = f"Translate {segment['title']}"
        if not commit_message:
            commit_message = f"Finalize local publish for {args.book_id}"
        run(["git", "commit", "-m", commit_message], cwd=repo_root)

    maybe_clear_claim(repo_root, args.book_id, args.automation_id, args.segment_id, shared_root)
    cleanup_completed_worktrees(repo_root, args.book_id, args.automation_id, shared_root)
    print(f"Committed local publish state in {repo_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
