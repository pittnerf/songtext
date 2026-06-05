#!/usr/bin/env python3
"""Render PDF song sheets to images and build public/data/songs.json."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF_DIR = ROOT / "songs_pdfs"
FALLBACK_PDF_DIR = ROOT / "songs_pdf"
DEFAULT_OUTPUT = ROOT / "public" / "data" / "songs.json"
DEFAULT_IMAGES_DIR = ROOT / "public" / "data" / "images"


def title_from_filename(path: Path) -> str:
    name = path.stem.replace("_", " ").replace("-", " ")
    return " ".join(name.split())


def number_from_filename(path: Path) -> int | None:
    match = re.match(r"^(\d+)", path.stem)
    return int(match.group(1)) if match else None


def pdf_to_images(
    pdf_path: Path,
    images_dir: Path,
    number: int,
    *,
    scale: float,
    jpeg_quality: int,
) -> list[str]:
    song_dir = images_dir / f"{number:02d}"
    song_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    matrix = fitz.Matrix(scale, scale)
    page_paths: list[str] = []

    for page_index, page in enumerate(doc, start=1):
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        filename = f"page-{page_index}.jpg"
        output_path = song_dir / filename
        pixmap.save(str(output_path), jpg_quality=jpeg_quality)
        page_paths.append(f"data/images/{number:02d}/{filename}")

    return page_paths


def find_pdfs(pdf_dir: Path) -> list[Path]:
    if not pdf_dir.is_dir():
        return []
    pdfs = list(pdf_dir.glob("*.pdf")) + list(pdf_dir.glob("*.PDF"))
    return sorted(set(pdfs))


def resolve_pdf_dir(explicit: Path | None) -> Path:
    if explicit is not None:
        return explicit
    if DEFAULT_PDF_DIR.is_dir() and find_pdfs(DEFAULT_PDF_DIR):
        return DEFAULT_PDF_DIR
    return FALLBACK_PDF_DIR


def build_catalogue(
    pdf_dir: Path,
    images_dir: Path,
    *,
    scale: float,
    jpeg_quality: int,
) -> list[dict]:
    pdfs = find_pdfs(pdf_dir)
    if not pdfs:
        raise SystemExit(
            f"No PDF files found in {pdf_dir}\n\n"
            "Add your song PDFs to one of these folders:\n"
            f"  {DEFAULT_PDF_DIR}\n"
            f"  {FALLBACK_PDF_DIR}\n\n"
            "Use a leading number in each filename, for example:\n"
            "  01_amazing_grace.pdf\n"
            "  02_silent_night.pdf\n"
        )

    if images_dir.exists():
        shutil.rmtree(images_dir)
    images_dir.mkdir(parents=True, exist_ok=True)

    songs: list[dict] = []
    seen_numbers: set[int] = set()

    for pdf_path in pdfs:
        number = number_from_filename(pdf_path)
        if number is None:
            print(f"Skipping (no leading number): {pdf_path.name}")
            continue
        if number in seen_numbers:
            print(f"Skipping duplicate number {number}: {pdf_path.name}")
            continue

        seen_numbers.add(number)
        pages = pdf_to_images(
            pdf_path,
            images_dir,
            number,
            scale=scale,
            jpeg_quality=jpeg_quality,
        )
        songs.append(
            {
                "number": number,
                "title": title_from_filename(pdf_path),
                "pages": pages,
            }
        )
        print(f"  {number:02d} {title_from_filename(pdf_path)} ({len(pages)} page(s))")

    songs.sort(key=lambda song: song["number"])
    return songs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=None,
        help=f"Folder with song PDFs (default: {DEFAULT_PDF_DIR.name} or {FALLBACK_PDF_DIR.name})",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--images-dir", type=Path, default=DEFAULT_IMAGES_DIR)
    parser.add_argument(
        "--scale",
        type=float,
        default=2.0,
        help="Render scale factor (2.0 ≈ 144 DPI, good for phones)",
    )
    parser.add_argument(
        "--jpeg-quality",
        type=int,
        default=90,
        help="JPEG quality for rendered pages (default: 90)",
    )
    args = parser.parse_args()

    pdf_dir = resolve_pdf_dir(args.pdf_dir)
    print(f"Rendering PDFs from {pdf_dir} …")
    songs = build_catalogue(
        pdf_dir,
        args.images_dir,
        scale=args.scale,
        jpeg_quality=args.jpeg_quality,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = {"songs": songs}
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(songs)} songs to {args.output}")


if __name__ == "__main__":
    main()
