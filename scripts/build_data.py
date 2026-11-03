"""Rebuild role-A provisions offline from page transcriptions, without model calls.

Numbering inside quoted amendment text is never treated as the enclosing law's
numbering. IDs use ASCII ND for NĐ. Source spans refer to cleaned page text.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from scripts.fetch_official import DATA, slug

ARTICLE = re.compile(r"^Điều\s+(\d+[a-zđ]?)\s*[.\uFF0E]", re.I)
CLAUSE = re.compile(r"^(\d+[a-zđ]?)\.\s+")
END = re.compile(r"^(?:TM\. |KT\. |Nơi nhận:|BỘ TRƯỞNG$|CHỦ TỊCH QUỐC HỘI|Luật này được Quốc hội|Nghị quyết này được Quốc hội)")


def dump(name, value):
    (DATA / (name + ".json")).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normal(s):
    return re.sub(r"\s+", " ", s).strip()


def split(src, pages):
    # Flatten while keeping exact character offsets on each page.
    lines = []
    for p in pages:
        pos = 0
        # Publisher colophons and repeated gazette titles are not statutory clauses.
        publisher = "XUẤT BẢN" in p["text"].replace("ỦX", "Ủ X") and not re.search(r"^Điều\s+\d", p["text"], re.M)
        continuation = "(Tiếp theo Công báo" in p["text"]
        first_article = re.search(r"^Điều\s+\d", p["text"], re.M) if continuation else None
        for text in p["text"].splitlines(keepends=True):
            line = text.rstrip("\n")
            if not publisher and not line.startswith("(Xem tiếp Công báo") and not (first_article and pos < first_article.start()):
                lines.append((p["trang"], pos, pos + len(line), line))
            pos += len(text)
    article, clause, quoted, active, spans, rows = None, "", False, False, [], []

    def emit():
        if article is None or not spans:
            return
        fragments = []
        for pg, start, end, _ in spans:
            if fragments and fragments[-1]["trang"] == pg:
                fragments[-1]["end"] = end
            else:
                fragments.append({"trang": pg, "start": start, "end": end})
        text = " ".join(normal(pages[f["trang"] - 1]["text"][f["start"]:f["end"]]) for f in fragments)
        pid = f"{slug(src['so_hieu'])}-D{article}" + (f"-K{clause}" if clause else "")
        rows.append({"id": pid, "so_hieu": src["so_hieu"], "dieu": article, "khoan": clause,
                     "noi_dung": text, "trang": fragments[0]["trang"], "trang_ket_thuc": fragments[-1]["trang"],
                     "page_spans": fragments,
                     "can_duyet_ocr": any(pages[f["trang"] - 1]["phuong_phap"] == "ocr_chua_duyet" for f in fragments),
                     "hieu_luc_tu": src["hieu_luc_tu"], "het_hieu_luc": src.get("het_hieu_luc"),
                     "kiem_duyet": "tach_tu_nguon_chinh_thuc_chua_ky_duyet_boi_nguoi"})

    for line in lines:
        t = line[3]
        match = ARTICLE.match(t) if not quoted else None
        if match:
            # Root articles are sequential. Embedded provisions with quoted numbers stay in their owner.
            number = match[1]
            if article is None and number != "1":
                continue
            if article is not None and (not number.isdigit() or int(number) != int(article) + 1):
                match = None
            else:
                emit()
                article, clause, spans, active = number, "", [], True
        if active and not quoted and END.match(t):
            emit()
            spans, active = [], False
            break
        if not active:
            continue
        cm = CLAUSE.match(t) if not quoted and not match else None
        if cm and (not clause or (cm[1].isdigit() and clause.isdigit() and int(cm[1]) == int(clause) + 1)):
            emit()
            clause, spans = cm[1], []
        spans.append(line)
        # Vietnamese documents mix curly opening quotes with ASCII closing quotes.
        for c in t:
            if c == "“":
                quoted = True
            elif c == "”":
                quoted = False
            elif c == '"':
                quoted = not quoted
    else:
        emit()
    return rows


def main():
    sources = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))
    provisions, report = [], []
    for src in sources:
        pages = json.loads((DATA / "pages" / (slug(src["so_hieu"]) + ".json")).read_text(encoding="utf-8"))
        rows = split(src, pages)
        if not rows:
            raise ValueError("No articles parsed: " + src["so_hieu"])
        provisions.extend(rows)
        report.append({"so_hieu": src["so_hieu"], "so_dieu": len({r['dieu'] for r in rows}),
                       "so_muc": len(rows), "so_trang_pdf": len(pages),
                       "so_muc_ocr_can_duyet": sum(r["can_duyet_ocr"] for r in rows)})
    ids = [r["id"] for r in provisions]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate provision IDs")
    dump("dieu_khoan", provisions)
    dump("van_ban", sources)
    dump("parse_report", report)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
