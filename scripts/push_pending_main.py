#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

from publish_from_worktree import push_origin_main, run


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Push already committed local main commits to origin/main with retry logic."
    )
    parser.add_argument(
        "--repo-root",
        required=True,
        help="Canonical checkout whose main branch may be ahead of origin/main.",
    )
    return parser.parse_args()


def ahead_behind(repo_root: Path) -> tuple[int, int]:
    result = run(["git", "rev-list", "--left-right", "--count", "origin/main...main"], cwd=repo_root)
    behind_raw, ahead_raw = result.stdout.strip().split()
    return int(ahead_raw), int(behind_raw)


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    ahead, behind = ahead_behind(repo_root)
    if ahead == 0:
        print("No pending local commits to push.")
        return 0
    if behind > 0:
        raise SystemExit(
            f"Local main is ahead by {ahead} and behind by {behind}; refusing automatic push-resume."
        )
    push_origin_main(repo_root)
    print(f"Pushed {ahead} pending local commit(s) from {repo_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
