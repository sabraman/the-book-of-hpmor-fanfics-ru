#!/bin/zsh

set -euo pipefail

REPO_ROOT="${0:A:h:h}"

cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is not installed"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh CLI authentication is missing or invalid"
  exit 1
fi

python3 scripts/push_pending_main.py --repo-root "$REPO_ROOT"
