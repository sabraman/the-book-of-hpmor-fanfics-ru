#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path


def bootstrap_local_venv() -> None:
    """Expose packages from .venv to plain python3 script execution."""
    root = Path(__file__).resolve().parents[1]
    venv = root / ".venv"
    if not venv.exists():
        return

    version_dir = f"python{sys.version_info.major}.{sys.version_info.minor}"
    candidates = [venv / "lib" / version_dir / "site-packages"]
    candidates.extend(sorted((venv / "lib").glob("python*/site-packages")))
    candidates.append(venv / "Lib" / "site-packages")

    seen: set[str] = set()
    for candidate in candidates:
        if candidate.is_dir():
            key = str(candidate.resolve())
            if key in seen:
                continue
            seen.add(key)
            sys.path.insert(0, key)
