#!/usr/bin/env python3

from __future__ import annotations

import argparse
import socket
import shutil
import subprocess
import time
from pathlib import Path

from pipeline_common import automation_state_path, load_manifest


RELEVANT_OPTIONAL_FILES = [
    "glossary/glossary.md",
    "books/various-muggles/config.json",
]

TRANSIENT_PUSH_ERRORS = (
    "Could not resolve host",
    "Temporary failure in name resolution",
    "Network is unreachable",
    "Failed to connect",
    "Operation timed out",
    "Connection timed out",
    "Connection reset by peer",
)
PUSH_RETRY_DELAYS = (10, 20, 40, 80)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish a translated segment from a worktree into the main checkout.")
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--segment-id", required=True)
    parser.add_argument("--source-root", required=True, help="Worktree root containing the finished translation.")
    parser.add_argument("--publisher-root", required=True, help="Canonical checkout used for git commit/push.")
    parser.add_argument("--automation-id")
    parser.add_argument("--shared-root", help="Shared writable root used for automation lease state.")
    parser.add_argument("--commit-message")
    return parser.parse_args()


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "Command failed"
        raise RuntimeError(f"{' '.join(cmd)}: {message}")
    return result


def ensure_clean_paths(repo_root: Path, paths: list[str]) -> None:
    result = run(["git", "status", "--short", "--", *paths], cwd=repo_root)
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    if lines:
        formatted = "\n".join(lines)
        raise RuntimeError(
            "Publisher checkout has local changes on files needed for automation publish:\n"
            f"{formatted}"
        )


def copy_if_changed(source_root: Path, publisher_root: Path, rel_path: str, copied: list[str]) -> None:
    source = source_root / rel_path
    if not source.exists():
        return
    target = publisher_root / rel_path
    if target.exists() and source.read_text(encoding="utf-8") == target.read_text(encoding="utf-8"):
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    copied.append(rel_path)


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


def is_transient_push_error(message: str) -> bool:
    return any(fragment in message for fragment in TRANSIENT_PUSH_ERRORS)


def capture_push_diagnostics(repo_root: Path) -> str:
    lines: list[str] = []
    try:
        head = run(["git", "rev-parse", "HEAD"], cwd=repo_root).stdout.strip()
        lines.append(f"head={head}")
    except Exception as exc:  # noqa: BLE001
        lines.append(f"head_error={exc}")

    try:
        ahead_behind = run(
            ["git", "rev-list", "--left-right", "--count", "origin/main...main"],
            cwd=repo_root,
        ).stdout.strip()
        lines.append(f"ahead_behind={ahead_behind}")
    except Exception as exc:  # noqa: BLE001
        lines.append(f"ahead_behind_error={exc}")

    for host in ("github.com", "api.github.com"):
        try:
            lines.append(f"dns_{host}={socket.gethostbyname(host)}")
        except Exception as exc:  # noqa: BLE001
            lines.append(f"dns_{host}_error={exc}")

    ls_remote = subprocess.run(
        ["git", "ls-remote", "origin", "-h", "refs/heads/main"],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if ls_remote.returncode == 0:
        lines.append(f"ls_remote={ls_remote.stdout.strip()}")
    else:
        message = ls_remote.stderr.strip() or ls_remote.stdout.strip() or "unknown ls-remote error"
        lines.append(f"ls_remote_error={message}")

    return "; ".join(lines)


def push_origin_main(repo_root: Path) -> None:
    attempts = len(PUSH_RETRY_DELAYS) + 1
    for index in range(attempts):
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return
        message = result.stderr.strip() or result.stdout.strip() or "git push failed"
        if index >= len(PUSH_RETRY_DELAYS) or not is_transient_push_error(message):
            diagnostics = capture_push_diagnostics(repo_root)
            raise RuntimeError(f"git push origin main: {message} | diagnostics: {diagnostics}")
        time.sleep(PUSH_RETRY_DELAYS[index])


def maybe_clear_claim(
    book_id: str,
    automation_id: str | None,
    segment_id: str,
    shared_root: Path | None = None,
) -> None:
    if not automation_id:
        return
    path = automation_state_path(automation_id, book_id, shared_root=shared_root)
    if not path.exists():
        return
    cmd = [
        "python3",
        str(Path(__file__).resolve().parent / "automation_claim.py"),
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
    run(cmd, cwd=Path(__file__).resolve().parents[1])


def main() -> int:
    args = parse_args()
    source_root = Path(args.source_root).resolve()
    publisher_root = Path(args.publisher_root).resolve()
    shared_root = Path(args.shared_root).resolve() if args.shared_root else publisher_root
    manifest = load_manifest(args.book_id)
    segment = next(item for item in manifest["segments"] if item["id"] == args.segment_id)

    segment_output_rel = f"books/{args.book_id}/{segment['output_file']}"
    source_segment = source_root / segment_output_rel
    if not source_segment.is_file():
        raise SystemExit(f"Missing translated segment in worktree: {source_segment}")

    protected_paths = [
        segment_output_rel,
        "books/various-muggles/manifest.json",
        f"site/src/content/chapters/{args.segment_id}.mdx",
        "site/src/lib/generated/catalog.ts",
        *RELEVANT_OPTIONAL_FILES,
    ]
    ensure_clean_paths(publisher_root, protected_paths)

    copied: list[str] = []
    copy_if_changed(source_root, publisher_root, segment_output_rel, copied)
    for rel_path in RELEVANT_OPTIONAL_FILES:
        copy_if_changed(source_root, publisher_root, rel_path, copied)

    if segment_output_rel not in copied:
        copied.append(segment_output_rel)

    run(["python3", "scripts/sync_manifest.py", "--book-id", args.book_id], cwd=publisher_root)
    run(["python3", "scripts/validate_run.py", "--book-id", args.book_id], cwd=publisher_root)
    run(["bun", "run", "sync-content"], cwd=publisher_root / "site")

    stage_paths = [
        *copied,
        "books/various-muggles/manifest.json",
        f"site/src/content/chapters/{args.segment_id}.mdx",
        "site/src/lib/generated/catalog.ts",
    ]
    run(["git", "add", "--", *stage_paths], cwd=publisher_root)

    if has_staged_changes(publisher_root, stage_paths):
        commit_message = args.commit_message or f"Translate {segment['title']}"
        run(["git", "commit", "-m", commit_message], cwd=publisher_root)

    push_origin_main(publisher_root)
    maybe_clear_claim(
        args.book_id,
        args.automation_id,
        args.segment_id,
        shared_root=shared_root,
    )

    print(f"Published {args.segment_id} from {source_root} into {publisher_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
