#!/usr/bin/env python3
"""Delete existing PDFs and convert all DOCX song sheets in docx/ to pdf/."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DOCX_DIR = ROOT / "docx"
DEFAULT_PDF_DIR = ROOT / "pdf"
WINDOWS_TMP = Path("/mnt/c/Users/Public/songtext_tmp")


def find_libreoffice() -> str | None:
    candidates = [
        "libreoffice",
        "soffice",
        "/mnt/c/Program Files/LibreOffice/program/soffice.exe",
        "/mnt/c/Program Files (x86)/LibreOffice/program/soffice.exe",
    ]
    for candidate in candidates:
        path = shutil.which(candidate) if "/" not in candidate else candidate
        if path and Path(path).exists():
            return path
    return None


def find_docx_files(docx_dir: Path) -> list[Path]:
    if not docx_dir.is_dir():
        return []
    files = list(docx_dir.glob("*.docx")) + list(docx_dir.glob("*.DOCX"))
    return sorted(set(files))


def find_pdf_files(pdf_dir: Path) -> list[Path]:
    if not pdf_dir.is_dir():
        return []
    files = list(pdf_dir.glob("*.pdf")) + list(pdf_dir.glob("*.PDF"))
    return sorted(set(files))


def delete_pdfs(pdf_dir: Path) -> int:
    pdf_dir.mkdir(parents=True, exist_ok=True)
    removed = 0
    for pdf_path in find_pdf_files(pdf_dir):
        pdf_path.unlink()
        print(f"Deleted {pdf_path.name}")
        removed += 1
    return removed


def export_pdf_with_word(docx_path: Path, pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    WINDOWS_TMP.mkdir(parents=True, exist_ok=True)
    temp_docx = WINDOWS_TMP / "convert_input.docx"
    temp_pdf = WINDOWS_TMP / "convert_output.pdf"
    shutil.copy2(docx_path, temp_docx)

    temp_docx_win = "C:\\Users\\Public\\songtext_tmp\\convert_input.docx"
    temp_pdf_win = "C:\\Users\\Public\\songtext_tmp\\convert_output.pdf"
    script = f"""
$docx = '{temp_docx_win}'
$pdf = '{temp_pdf_win}'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($docx)
$doc.SaveAs([ref]$pdf, [ref]17)
$doc.Close([ref]0)
$word.Quit()
"""
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", script],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0 or not temp_pdf.exists():
        raise RuntimeError(
            f"PDF conversion with Microsoft Word failed for {docx_path.name}.\n"
            f"stdout: {result.stdout}\n"
            f"stderr: {result.stderr}"
        )
    shutil.copy2(temp_pdf, pdf_path)


def export_pdf_with_libreoffice(docx_path: Path, pdf_path: Path, lo: str) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        cmd = [
            lo,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(docx_path.resolve()),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"PDF conversion failed for {docx_path.name}.\n"
                f"stdout: {result.stdout}\n"
                f"stderr: {result.stderr}"
            )

        generated = out_dir / f"{docx_path.stem}.pdf"
        if not generated.exists():
            pdfs = list(out_dir.glob("*.pdf"))
            if not pdfs:
                raise RuntimeError(f"PDF conversion produced no output for {docx_path.name}.")
            generated = pdfs[0]

        shutil.move(str(generated), pdf_path)


def export_pdf(docx_path: Path, pdf_path: Path, *, lo: str | None) -> None:
    if lo is not None:
        export_pdf_with_libreoffice(docx_path, pdf_path, lo)
        return

    if shutil.which("wslpath") and shutil.which("powershell.exe"):
        export_pdf_with_word(docx_path, pdf_path)
        return

    raise RuntimeError(
        "PDF export needs LibreOffice or Microsoft Word (via WSL + PowerShell)."
    )


def convert_docx_files(
    docx_dir: Path,
    pdf_dir: Path,
    *,
    lo: str | None,
) -> int:
    docx_files = find_docx_files(docx_dir)
    if not docx_files:
        raise SystemExit(f"No DOCX files found in {docx_dir}")

    pdf_dir.mkdir(parents=True, exist_ok=True)
    converted = 0
    for docx_path in docx_files:
        pdf_path = pdf_dir / f"{docx_path.stem}.pdf"
        export_pdf(docx_path, pdf_path, lo=lo)
        print(f"Converted {docx_path.name} -> {pdf_path.name}")
        converted += 1
    return converted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--docx-dir",
        type=Path,
        default=DEFAULT_DOCX_DIR,
        help=f"Folder with source DOCX files (default: {DEFAULT_DOCX_DIR.name}/)",
    )
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=DEFAULT_PDF_DIR,
        help=f"Folder for generated PDF files (default: {DEFAULT_PDF_DIR.name}/)",
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Do not delete existing PDFs before converting",
    )
    args = parser.parse_args()

    lo = find_libreoffice()
    if lo:
        print(f"Using LibreOffice: {lo}")
    elif shutil.which("powershell.exe"):
        print("Using Microsoft Word via PowerShell")
    else:
        raise SystemExit(
            "No PDF converter found. Install LibreOffice or use WSL with Microsoft Word."
        )

    if not args.keep_existing:
        removed = delete_pdfs(args.pdf_dir)
        print(f"Removed {removed} PDF file(s) from {args.pdf_dir}")

    converted = convert_docx_files(args.docx_dir, args.pdf_dir, lo=lo)
    print(f"Converted {converted} DOCX file(s) to {args.pdf_dir}")


if __name__ == "__main__":
    main()
