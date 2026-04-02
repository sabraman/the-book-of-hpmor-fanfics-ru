#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import os
import posixpath
import re
import shutil
import subprocess
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET

REPO_ROOT = Path(__file__).resolve().parents[1]
HTML_LIKE_SUFFIXES = {".xhtml", ".html"}
NON_ASSET_SUFFIXES = HTML_LIKE_SUFFIXES | {".opf", ".ncx", ".xml"}
OPF_NS = {"opf": "http://www.idpf.org/2007/opf", "dc": "http://purl.org/dc/elements/1.1/"}
NON_READER_BASENAMES = {"cover.xhtml", "titlepage.xhtml", "toc.xhtml", "preface.xhtml"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path, default: Any | None = None) -> Any:
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def extract_epub_to_dir(epub_path: Path, out_dir: Path) -> None:
    reset_dir(out_dir)
    with zipfile.ZipFile(epub_path) as archive:
        archive.extractall(out_dir)


def find_ebook_convert() -> str | None:
    env_path = os.environ.get("EBOOK_CONVERT")
    candidates = [
        env_path,
        shutil.which("ebook-convert"),
        "/Applications/calibre.app/Contents/MacOS/ebook-convert",
        "/Applications/Calibre.app/Contents/MacOS/ebook-convert",
        "/usr/local/bin/ebook-convert",
        "/opt/homebrew/bin/ebook-convert",
    ]
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate:
            continue
        if candidate in seen:
            continue
        seen.add(candidate)
        candidate_path = Path(candidate)
        if candidate_path.is_file():
            return str(candidate_path)
    return None


def run_command(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        message = stderr or stdout or f"Command failed: {' '.join(cmd)}"
        raise RuntimeError(message)
    return result


def clean_markdown(content: str) -> str:
    content = content.replace("\ufeff", "").replace("\u00a0", " ")
    content = re.sub(r"\{\.calibre[^}]*\}", "", content)
    content = re.sub(r"\s+\{#[^}]*\.calibre[^}]*\}", "", content)
    content = re.sub(r"\\\n", "\n", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip() + "\n"


def normalize_href(current_href: str, raw_href: str) -> str:
    current_dir = PurePosixPath(current_href).parent.as_posix()
    if raw_href.startswith("/"):
        return posixpath.normpath(raw_href.lstrip("/"))
    return posixpath.normpath(posixpath.join(current_dir, raw_href))


def segment_id(order: int) -> str:
    return f"seg-{order:04d}"


def segment_filename(order: int) -> str:
    return f"segment{order:04d}.md"


def anchor_id(seg_id: str, fragment: str | None = None) -> str:
    if not fragment:
        return seg_id
    slug = re.sub(r"[^A-Za-z0-9]+", "-", fragment).strip("-").lower()[:32] or "fragment"
    digest = hashlib.sha1(fragment.encode("utf-8")).hexdigest()[:10]
    return f"{seg_id}__{slug}-{digest}"


def story_id_from_href(href: str) -> str:
    parts = PurePosixPath(href).parts
    if parts and parts[0].isdigit():
        return f"story-{int(parts[0]):02d}"
    return "frontmatter"


def is_reader_segment(original_path: str) -> bool:
    path = PurePosixPath(original_path)
    basename = path.name.lower()
    suffix = path.suffix.lower()
    if suffix not in HTML_LIKE_SUFFIXES:
        return False
    return basename not in NON_READER_BASENAMES


def automation_state_path(
    automation_id: str, book_id: str, shared_root: Path | None = None
) -> Path:
    base_root = shared_root or (
        Path(os.environ["AUTOMATION_SHARED_ROOT"]).expanduser()
        if os.environ.get("AUTOMATION_SHARED_ROOT")
        else REPO_ROOT
    )
    return base_root / ".codex-automation-state" / automation_id / f"{book_id}.json"


def book_paths(book_id: str) -> dict[str, Path]:
    book_dir = REPO_ROOT / "books" / book_id
    return {
        "book_dir": book_dir,
        "source_dir": book_dir / "source",
        "output_dir": book_dir / "output",
        "assets_dir": book_dir / "assets",
        "build_dir": book_dir / "build",
        "config_path": book_dir / "config.json",
        "manifest_path": book_dir / "manifest.json",
        "prompt_path": book_dir / "CODEX_TRANSLATION.md",
    }


def ensure_book_dirs(book_id: str) -> dict[str, Path]:
    paths = book_paths(book_id)
    for key in ("book_dir", "source_dir", "output_dir", "assets_dir", "build_dir"):
        paths[key].mkdir(parents=True, exist_ok=True)
    return paths


def load_manifest(book_id: str) -> dict[str, Any]:
    paths = book_paths(book_id)
    manifest = load_json(paths["manifest_path"])
    if manifest is None:
        raise FileNotFoundError(f"Manifest not found: {paths['manifest_path']}")
    return manifest


def load_config(book_id: str) -> dict[str, Any]:
    paths = book_paths(book_id)
    config = load_json(paths["config_path"])
    if config is None:
        raise FileNotFoundError(f"Config not found: {paths['config_path']}")
    return config


def top_level_spine(src_root: Path) -> list[str]:
    content_opf = src_root / "content.opf"
    root = ET.parse(content_opf).getroot()
    manifest = {}
    for item in root.find("opf:manifest", OPF_NS) or []:
        item_id = item.attrib.get("id")
        href = item.attrib.get("href")
        if item_id and href:
            manifest[item_id] = href
    spine: list[str] = []
    for itemref in root.find("opf:spine", OPF_NS) or []:
        idref = itemref.attrib.get("idref")
        if idref and idref in manifest:
            spine.append(manifest[idref])
    return spine


def source_book_title(src_root: Path) -> str:
    content_opf = src_root / "content.opf"
    root = ET.parse(content_opf).getroot()
    title = root.find(".//dc:title", OPF_NS)
    if title is not None and title.text:
        return title.text.strip()
    return src_root.name


def copy_assets(src_root: Path, assets_dir: Path) -> int:
    reset_dir(assets_dir)
    copied = 0
    for path in sorted(src_root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(src_root)
        if rel.parts and rel.parts[0] == "META-INF":
            continue
        if path.name == "mimetype":
            continue
        if path.suffix.lower() in NON_ASSET_SUFFIXES:
            continue
        target = assets_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        copied += 1
    return copied


def detect_runtime_status(book_id: str, manifest: dict[str, Any]) -> dict[str, Any]:
    paths = book_paths(book_id)
    statuses: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    errors: list[str] = []

    for segment in manifest["segments"]:
        source_path = paths["book_dir"] / segment["source_file"]
        output_path = paths["book_dir"] / segment["output_file"]

        if not source_path.is_file():
            status = "source-missing"
            errors.append(f"{segment['id']}: missing source file {segment['source_file']}")
        else:
            current_hash = sha256_file(source_path)
            if current_hash != segment["source_hash"]:
                status = "stale-source"
                errors.append(
                    f"{segment['id']}: source hash changed for {segment['source_file']}"
                )
            elif output_path.is_file():
                if output_path.stat().st_size == 0:
                    status = "empty-output"
                    errors.append(f"{segment['id']}: empty output file {segment['output_file']}")
                else:
                    status = "translated"
            else:
                status = "pending"

        counts[status] = counts.get(status, 0) + 1
        statuses.append(
            {
                "segment": segment,
                "status": status,
                "source_path": source_path,
                "output_path": output_path,
            }
        )

    return {
        "statuses": statuses,
        "counts": counts,
        "errors": errors,
        "pending_count": counts.get("pending", 0),
        "translated_count": counts.get("translated", 0),
        "segment_count": len(manifest["segments"]),
    }


def sync_manifest_translation_status(
    manifest: dict[str, Any], runtime: dict[str, Any]
) -> tuple[dict[str, Any], int]:
    status_by_id = {
        item["segment"]["id"]: item["status"]
        for item in runtime["statuses"]
    }
    updated = 0
    for segment in manifest["segments"]:
        new_status = status_by_id.get(segment["id"], segment.get("translation_status", "pending"))
        if segment.get("translation_status") != new_status:
            segment["translation_status"] = new_status
            updated += 1
    return manifest, updated
