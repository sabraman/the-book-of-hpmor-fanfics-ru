#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET

XML_SUFFIXES = {".xhtml", ".html", ".xml", ".opf", ".ncx"}
BLOCK_TAGS = {"p", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "title"}
OPF_NS = {"opf": "http://www.idpf.org/2007/opf"}
DC_NS = "http://purl.org/dc/elements/1.1/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate an unpacked EPUB source tree."
    )
    parser.add_argument("--root", required=True, help="Path to the unpacked EPUB root.")
    parser.add_argument(
        "--fail-on-untranslated",
        action="store_true",
        help="Exit with an error if untranslated English passages are detected.",
    )
    parser.add_argument(
        "--warning-limit",
        type=int,
        default=25,
        help="Maximum number of untranslated warnings to print.",
    )
    return parser.parse_args()


def local_name(tag: object) -> str:
    if not isinstance(tag, str):
        return ""
    if "}" in tag:
        return tag.rsplit("}", 1)[1]
    return tag


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def is_probably_untranslated(text: str) -> bool:
    compact = normalize_text(text)
    if not compact:
        return False
    if re.search(r"[А-Яа-яЁё]", compact):
        return False
    latin_words = re.findall(r"[A-Za-z][A-Za-z'’\-]+", compact)
    return len(latin_words) >= 6 and len(" ".join(latin_words)) >= 30


def parse_xml_files(root: Path) -> tuple[dict[Path, ET.ElementTree], list[str]]:
    parsed: dict[Path, ET.ElementTree] = {}
    errors: list[str] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in XML_SUFFIXES:
            continue
        try:
            parsed[path.resolve()] = ET.parse(path)
        except ET.ParseError as exc:
            errors.append(f"{path.relative_to(root)}: XML parse error: {exc}")
    return parsed, errors


def build_id_index(parsed: dict[Path, ET.ElementTree]) -> dict[Path, set[str]]:
    id_index: dict[Path, set[str]] = {}
    for path, tree in parsed.items():
        ids: set[str] = set()
        for element in tree.getroot().iter():
            for attr in ("id", "name"):
                value = element.attrib.get(attr)
                if value:
                    ids.add(value)
        id_index[path] = ids
    return id_index


def validate_mimetype(root: Path, errors: list[str]) -> None:
    mimetype_path = root / "mimetype"
    if not mimetype_path.is_file():
        errors.append("mimetype: missing file")
        return
    content = mimetype_path.read_text(encoding="utf-8").strip()
    if content != "application/epub+zip":
        errors.append("mimetype: expected application/epub+zip")


def validate_container(root: Path, parsed: dict[Path, ET.ElementTree], errors: list[str]) -> None:
    container_path = (root / "META-INF" / "container.xml").resolve()
    if not container_path.is_file():
        errors.append("META-INF/container.xml: missing file")
        return

    tree = parsed.get(container_path)
    if tree is None:
        errors.append("META-INF/container.xml: could not be parsed")
        return

    rootfiles = tree.findall(".//{*}rootfile")
    if not rootfiles:
        errors.append("META-INF/container.xml: no rootfile entries found")
        return

    for rootfile in rootfiles:
        full_path = rootfile.attrib.get("full-path", "")
        if not full_path:
            errors.append("META-INF/container.xml: rootfile entry missing full-path")
            continue
        target = (root / full_path).resolve()
        if not target.is_file():
            errors.append(f"META-INF/container.xml: missing rootfile target {full_path}")


def is_missing_placeholder_opf(tree: ET.ElementTree) -> bool:
    for title in tree.findall(f".//{{{DC_NS}}}title"):
        if "[missing]" in normalize_text(title.text or "").lower():
            return True
    return False


def validate_opf_files(
    root: Path,
    parsed: dict[Path, ET.ElementTree],
    errors: list[str],
    structural_warnings: list[str],
) -> set[Path]:
    placeholder_opfs: set[Path] = set()
    for path, tree in sorted(parsed.items()):
        if path.suffix.lower() != ".opf":
            continue

        manifest = tree.find("opf:manifest", OPF_NS)
        spine = tree.find("opf:spine", OPF_NS)
        rel_path = path.relative_to(root)
        is_placeholder = is_missing_placeholder_opf(tree)
        if is_placeholder:
            placeholder_opfs.add(path)

        if manifest is None:
            errors.append(f"{rel_path}: missing manifest")
            continue
        if spine is None:
            errors.append(f"{rel_path}: missing spine")
            continue

        manifest_ids: dict[str, str] = {}
        for item in manifest.findall("opf:item", OPF_NS):
            item_id = item.attrib.get("id")
            href = item.attrib.get("href")
            if not item_id or not href:
                errors.append(f"{rel_path}: manifest item missing id or href")
                continue
            manifest_ids[item_id] = href
            target = (path.parent / unquote(href)).resolve()
            if not target.is_file():
                message = f"{rel_path}: manifest href missing target {href}"
                if is_placeholder:
                    structural_warnings.append(message)
                else:
                    errors.append(message)

        for itemref in spine.findall("opf:itemref", OPF_NS):
            idref = itemref.attrib.get("idref")
            if not idref:
                errors.append(f"{rel_path}: spine itemref missing idref")
                continue
            if idref not in manifest_ids:
                errors.append(f"{rel_path}: spine idref not found in manifest: {idref}")
    return placeholder_opfs


def resolve_local_target(root: Path, current_path: Path, raw_target: str) -> tuple[Path, str] | None:
    parts = urlsplit(raw_target)
    if parts.scheme or parts.netloc:
        return None

    link_path = unquote(parts.path)
    if link_path.startswith("/"):
        target = (root / link_path.lstrip("/")).resolve()
    elif link_path:
        target = (current_path.parent / link_path).resolve()
    else:
        target = current_path.resolve()

    root_resolved = root.resolve()
    if target != root_resolved and root_resolved not in target.parents:
        return target, parts.fragment
    return target, parts.fragment


def validate_internal_links(
    root: Path,
    parsed: dict[Path, ET.ElementTree],
    id_index: dict[Path, set[str]],
    placeholder_opfs: set[Path],
    errors: list[str],
    structural_warnings: list[str],
) -> None:
    for path, tree in sorted(parsed.items()):
        rel_path = path.relative_to(root)
        for element in tree.getroot().iter():
            for attr_name, attr_value in element.attrib.items():
                if local_name(attr_name) not in {"href", "src"} or not attr_value:
                    continue
                resolved = resolve_local_target(root, path, attr_value)
                if resolved is None:
                    continue
                target, fragment = resolved
                if not target.is_file():
                    message = f"{rel_path}: broken link target {attr_value}"
                    if path in placeholder_opfs:
                        structural_warnings.append(message)
                    else:
                        errors.append(message)
                    continue
                if fragment and target in id_index and fragment not in id_index[target]:
                    errors.append(f"{rel_path}: missing fragment {fragment} in {attr_value}")


def collect_untranslated_warnings(
    root: Path, parsed: dict[Path, ET.ElementTree]
) -> list[str]:
    warnings: list[str] = []

    for path, tree in sorted(parsed.items()):
        suffix = path.suffix.lower()
        if suffix not in {".xhtml", ".html"}:
            continue

        for element in tree.getroot().iter():
            if local_name(element.tag) not in BLOCK_TAGS:
                continue
            text = normalize_text("".join(element.itertext()))
            if is_probably_untranslated(text):
                excerpt = text[:120] + ("..." if len(text) > 120 else "")
                warnings.append(f"{path.relative_to(root)}: {excerpt}")
    return warnings


def print_messages(label: str, messages: list[str], limit: int | None = None) -> None:
    if not messages:
        return
    print(f"{label} ({len(messages)}):")
    to_show = messages if limit is None else messages[:limit]
    for message in to_show:
        print(f"  - {message}")
    if limit is not None and len(messages) > limit:
        print(f"  - ... {len(messages) - limit} more")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.is_dir():
        print(f"Root directory not found: {root}", file=sys.stderr)
        return 1

    parsed, errors = parse_xml_files(root)
    structural_warnings: list[str] = []
    validate_mimetype(root, errors)
    validate_container(root, parsed, errors)
    placeholder_opfs = validate_opf_files(root, parsed, errors, structural_warnings)

    id_index = build_id_index(parsed)
    validate_internal_links(
        root, parsed, id_index, placeholder_opfs, errors, structural_warnings
    )

    warnings = collect_untranslated_warnings(root, parsed)

    print(f"Parsed XML-like files: {len(parsed)}")
    print_messages("Errors", errors)
    print_messages("Structural warnings", structural_warnings)
    print_messages("Untranslated warnings", warnings, limit=args.warning_limit)

    if errors:
        return 1
    if args.fail_on_untranslated and warnings:
        return 1

    print("Validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
