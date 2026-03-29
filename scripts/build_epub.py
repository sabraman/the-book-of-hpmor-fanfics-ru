#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build an EPUB from an unpacked source tree."
    )
    parser.add_argument("--root", required=True, help="Path to the unpacked EPUB root.")
    parser.add_argument("--output", required=True, help="Path to the output EPUB file.")
    return parser.parse_args()


def should_skip(path: Path) -> bool:
    return path.name == ".DS_Store" or "__pycache__" in path.parts


def iter_source_files(root: Path) -> list[Path]:
    files = []
    for path in root.rglob("*"):
        if path.is_file() and not should_skip(path):
            files.append(path)
    return sorted(files, key=lambda item: item.relative_to(root).as_posix())


def main() -> int:
    args = parse_args()
    root = Path(args.root)
    output = Path(args.output)

    if not root.is_dir():
        print(f"Source root not found: {root}", file=sys.stderr)
        return 1

    mimetype_path = root / "mimetype"
    if not mimetype_path.is_file():
        print("Source tree is missing mimetype.", file=sys.stderr)
        return 1

    output.parent.mkdir(parents=True, exist_ok=True)
    source_files = iter_source_files(root)

    with zipfile.ZipFile(output, "w") as archive:
        archive.write(mimetype_path, "mimetype", compress_type=zipfile.ZIP_STORED)

        for path in source_files:
            if path == mimetype_path:
                continue
            archive.write(
                path,
                path.relative_to(root).as_posix(),
                compress_type=zipfile.ZIP_DEFLATED,
            )

    print(f"Built {output} from {root} with {len(source_files)} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
