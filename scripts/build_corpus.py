"""Build data/dieu_khoan.json from official PDFs listed in data/sources.json.

Role A fills data/sources.json (one entry per document, from vbpl.vn / Công báo /
gdt.gov.vn) and drops the PDFs in data/pdf/. This script asks Spark to split each PDF
into articles/clauses, then keeps only clauses whose text is verbatim in the PDF
(whitespace-normalised), so no provision text is invented. Relations (quan_he.json)
are written by hand by role A; see data/README.md.

    python -m scripts.build_corpus            # all documents
    python -m scripts.build_corpus 108/2025/ND-CP   # one document
"""

from __future__ import annotations

import json
import re
import sys

from lexvi.config import DATA_DIR, ask_json, make_client
from lexvi.ingest import pdf_text
from lexvi.verify import normalize

SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {"khoan": {"type": "array", "items": {
        "type": "object", "additionalProperties": False,
        "properties": {"dieu": {"type": "string"}, "khoan": {"type": "string"},
                       "trang": {"type": "integer"}, "noi_dung": {"type": "string"}},
        "required": ["dieu", "khoan", "trang", "noi_dung"]}}},
    "required": ["khoan"],
}
PROMPT = (
    "Tách văn bản pháp luật dưới đây thành từng khoản. Mỗi phần tử: số điều, số khoản (rỗng nếu điều không chia "
    "khoản), số trang (theo nhãn [trang n]), và noi_dung chép NGUYÊN VĂN toàn bộ khoản đó, không tóm tắt, không "
    "sửa chữ, bỏ các nhãn [trang n]. Bỏ qua phần căn cứ ban hành và nơi nhận.\n\n"
)
CHUNK_PAGES = 6


def _slug(so_hieu: str) -> str:
    return re.sub(r"[^0-9A-Za-z]+", "-", so_hieu).strip("-")


def split_document(client, so_hieu: str, pages: list[str]) -> tuple[list, list]:
    kept, rejected, full = [], [], normalize(" ".join(pages))
    for start in range(0, len(pages), CHUNK_PAGES):
        chunk = "\n".join(f"[trang {i}]\n{t}" for i, t in enumerate(pages[start:start + CHUNK_PAGES], start + 1))
        for k in ask_json(client, PROMPT + chunk, SCHEMA, "tach_dieu_khoan")["khoan"]:
            pid = f"{_slug(so_hieu)}-D{k['dieu']}" + (f"-K{k['khoan']}" if k["khoan"] else "")
            row = {"id": pid, "so_hieu": so_hieu, **k}
            (kept if normalize(k["noi_dung"]) in full else rejected).append(row)
    return kept, rejected


def main(only: str | None) -> None:
    sources = json.loads((DATA_DIR / "sources.json").read_text(encoding="utf-8"))
    out_path = DATA_DIR / "dieu_khoan.json"
    rows = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else []
    client = make_client()
    for src in sources:
        if only and src["so_hieu"] != only:
            continue
        pages = pdf_text((DATA_DIR / "pdf" / src["file"]).read_bytes())
        kept, rejected = split_document(client, src["so_hieu"], pages)
        rows = [r for r in rows if r["so_hieu"] != src["so_hieu"]] + kept
        print(f"{src['so_hieu']}: {len(kept)} khoản giữ, {len(rejected)} bị loại vì không khớp nguyên văn")
        for r in rejected[:3]:
            print("   loại:", r["id"], r["noi_dung"][:80])
    out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    van_ban = [{k: s.get(k) for k in ("so_hieu", "loai", "tieu_de", "ngay_ban_hanh", "hieu_luc_tu",
                                       "het_hieu_luc", "nguon_url")} for s in sources]
    (DATA_DIR / "van_ban.json").write_text(json.dumps(van_ban, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
