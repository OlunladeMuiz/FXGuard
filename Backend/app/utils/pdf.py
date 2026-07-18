from __future__ import annotations

from typing import Iterable


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def render_simple_pdf(title: str, lines: Iterable[str]) -> bytes:
    """
    Build a minimal single-page PDF containing a title and text lines.
    Avoids external dependencies for portability.
    """
    safe_title = _escape_pdf_text(title)
    safe_lines = [_escape_pdf_text(line) for line in lines]

    text_lines = [
        f"BT /F1 16 Tf 50 750 Td ({safe_title}) Tj",
        "0 -22 Td /F1 11 Tf",
    ]
    for line in safe_lines:
        text_lines.append(f"({line}) Tj")
        text_lines.append("0 -16 Td")
    text_lines.append("ET")

    content_stream = "\n".join(text_lines)
    content_bytes = content_stream.encode("utf-8")

    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj"
    )
    objects.append(
        b"4 0 obj << /Length %d >> stream\n%s\nendstream endobj"
        % (len(content_bytes), content_bytes)
    )
    objects.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj")

    offsets = []
    pdf_body = b"%PDF-1.4\n"
    for obj in objects:
        offsets.append(len(pdf_body))
        pdf_body += obj + b"\n"

    xref_offset = len(pdf_body)
    xref_lines = ["xref", f"0 {len(objects) + 1}", "0000000000 65535 f "]
    for offset in offsets:
        xref_lines.append(f"{offset:010d} 00000 n ")
    xref = "\n".join(xref_lines).encode("utf-8")

    trailer = (
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF"
    ).encode("utf-8")

    return pdf_body + xref + b"\n" + trailer
