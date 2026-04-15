#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from pipeline_common import automation_state_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove completed automation worktrees that are no longer needed."
    )
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--automation-id", required=True)
    parser.add_argument("--shared-root", required=True)
    parser.add_argument("--queue-worktree")
    parser.add_argument("--preserve-worktree")
    return parser.parse_args()


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "Command failed"
        raise RuntimeError(f"{' '.join(cmd)}: {message}")
    return result


def queue_path(shared_root: Path, automation_id: str, book_id: str) -> Path:
    return shared_root / ".codex-automation-state" / automation_id / f"{book_id}-completed-worktrees.json"


def load_queue(path: Path) -> list[str]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return []
    return [str(item) for item in data]


def save_queue(path: Path, items: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def active_claim_worktree(shared_root: Path, automation_id: str, book_id: str) -> str | None:
    state_path = automation_state_path(automation_id, book_id, shared_root=shared_root)
    if not state_path.is_file():
        return None
    state = json.loads(state_path.read_text(encoding="utf-8"))
    worktree_root = state.get("worktree_root")
    if isinstance(worktree_root, str) and worktree_root:
        return str(Path(worktree_root).resolve())
    return None


def remove_worktree(repo_root: Path, worktree: Path) -> bool:
    if not worktree.exists():
        return True
    result = subprocess.run(
        ["git", "worktree", "remove", "--force", str(worktree)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return True
    message = result.stderr.strip() or result.stdout.strip() or "git worktree remove failed"
    if "is a main working tree" in message:
        return False
    if "contains modified or untracked files" in message:
        return False
    raise RuntimeError(f"git worktree remove --force {worktree}: {message}")


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    shared_root = Path(args.shared_root).resolve()
    preserve = Path(args.preserve_worktree).resolve() if args.preserve_worktree else None
    queue_file = queue_path(shared_root, args.automation_id, args.book_id)

    items = [str(Path(item).resolve()) for item in load_queue(queue_file)]
    if args.queue_worktree:
        queued = str(Path(args.queue_worktree).resolve())
        if queued not in items:
            items.append(queued)

    active = active_claim_worktree(shared_root, args.automation_id, args.book_id)
    remaining: list[str] = []
    removed: list[str] = []

    for item in items:
        path = Path(item)
        resolved = str(path.resolve())
        if preserve and resolved == str(preserve):
            remaining.append(resolved)
            continue
        if active and resolved == active:
            remaining.append(resolved)
            continue
        if remove_worktree(repo_root, path):
            removed.append(resolved)
        else:
            remaining.append(resolved)

    save_queue(queue_file, remaining)

    if removed:
        print("Removed worktrees:")
        for item in removed:
            print(item)
    else:
        print("No completed worktrees removed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
