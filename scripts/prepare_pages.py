"""Extract page-addressable source text. OCR is explicitly marked for review."""
import json
import os
import re
import unicodedata

import pymupdf

from scripts.fetch_official import DATA, slug


def clean(text):
    lines = []
    for line in unicodedata.normalize("NFC", text).splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if not line or re.fullmatch(r"\d+", line):
            continue
        if re.match(r"^(?:\d+\s+)?CÔNG BÁO/", line) or line.startswith(("Người ký:", "Ký bởi:", "Email:", "Cơ quan:", "Thời gian ký:", "Ngày ký:")):
            continue
        lines.append(line)
    return "\n".join(lines)


def main():
    (DATA / "pages").mkdir(exist_ok=True)
    rows = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))
    for src in rows:
        name = slug(src["so_hieu"])
        pages, doc = [], pymupdf.open(DATA / "pdf" / src["file"])
        for i, page in enumerate(doc, 1):
            raw = page.get_text(sort=True)
            method = "pdf_text"
            legible_short = len(clean(raw)) >= 120 and bool(re.search(r"Điều|Bộ trưởng|Bộ Tài chính|hiệu lực", clean(raw)))
            if len(clean(raw)) < 400 and not legible_short:
                tessdata = os.environ.get("LEXVI_TESSDATA")
                if not tessdata:
                    raise RuntimeError(f"{name} page {i} requires OCR. Set LEXVI_TESSDATA (vie+eng).")
                tp = page.get_textpage_ocr(language="vie+eng", dpi=300, full=True, tessdata=tessdata)
                raw = page.get_text(textpage=tp)
                method = "ocr_chua_duyet"
            part = next((p for p in src.get("pdf_parts", []) if p["trang_tu"] <= i < p["trang_tu"] + p["so_trang"]), None)
            original_page = i - part["trang_tu"] + 1 if part else i
            source_url = part["url"] if part else src["pdf_url"]
            pages.append({"trang": i, "trang_nguon": original_page, "nguon_url": source_url,
                          "phuong_phap": method, "raw_text": raw, "text": clean(raw)})
        # Optional source-checked transcriptions are explicit, separate from OCR.
        correction = DATA / "transcriptions" / (name + ".json")
        if correction.exists():
            for key, text in json.loads(correction.read_text(encoding="utf-8")).items():
                pages[int(key) - 1].update(text=clean(text), phuong_phap="doi_chieu_ban_goc_bang_agent")
        (DATA / "pages" / (name + ".json")).write_text(json.dumps(pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(name, len(pages), sum(p["phuong_phap"] == "ocr_chua_duyet" for p in pages), flush=True)


if __name__ == "__main__":
    main()
