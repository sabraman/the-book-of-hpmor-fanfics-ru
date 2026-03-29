#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
import sys
import zipfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Unpack an EPUB into editable English and Russian source trees."
    )
    parser.add_argument("input_epub", help="Path to the source EPUB file.")
    parser.add_argument(
        "--en-dir",
        default="src/en",
        help="Directory for the unpacked English baseline.",
    )
    parser.add_argument(
        "--ru-dir",
        default="src/ru",
        help="Directory for the Russian working tree copied from the English baseline.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing output directories.",
    )
    return parser.parse_args()


def remove_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def prepare_directory(path: Path, force: bool) -> None:
    if path.exists():
        if not force:
            raise FileExistsError(f"{path} already exists. Re-run with --force to overwrite it.")
        remove_path(path)
    path.mkdir(parents=True, exist_ok=True)


def extract_epub(epub_path: Path, out_dir: Path) -> int:
    file_count = 0
    with zipfile.ZipFile(epub_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            destination = out_dir / info.filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info, "r") as source_handle, destination.open("wb") as target_handle:
                shutil.copyfileobj(source_handle, target_handle)
            file_count += 1
    return file_count


def count_files(root: Path) -> int:
    return sum(1 for path in root.rglob("*") if path.is_file())


def main() -> int:
    args = parse_args()

    input_epub = Path(args.input_epub)
    en_dir = Path(args.en_dir)
    ru_dir = Path(args.ru_dir)

    if not input_epub.is_file():
        print(f"Input EPUB not found: {input_epub}", file=sys.stderr)
        return 1

    if en_dir.resolve() == ru_dir.resolve():
        print("--en-dir and --ru-dir must be different directories.", file=sys.stderr)
        return 1

    try:
        prepare_directory(en_dir, args.force)
        extracted_files = extract_epub(input_epub, en_dir)

        if ru_dir.exists():
            if not args.force:
                raise FileExistsError(
                    f"{ru_dir} already exists. Re-run with --force to overwrite it."
                )
            remove_path(ru_dir)

        shutil.copytree(en_dir, ru_dir)
    except (FileExistsError, OSError, zipfile.BadZipFile) as exc:
        print(f"Failed to unpack EPUB: {exc}", file=sys.stderr)
        return 1

    print(f"Imported {extracted_files} files into {en_dir}")
    print(f"Copied {count_files(ru_dir)} files into {ru_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
