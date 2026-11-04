"""Offline corpus checks. This measures data consistency, not model accuracy."""
import hashlib
import json
from collections import Counter
from datetime import date
from urllib.parse import urlparse

from lexvi.store import LawStore
from lexvi.verify import code_checks
from scripts.fetch_official import DATA, official, slug
from scripts.build_data import normal, dump

EXPECTED_ARTICLES = [18, 2, 5, 29, 53, 152, 19, 5, 9, 4, 17, 17, 20, 26, 2, 2, 3, 61, 12, 2, 45, 25, 2, 5, 10, 40, 2, 6, 76, 20]


def audit():
    read = lambda n: json.loads((DATA / (n + ".json")).read_text(encoding="utf-8"))
    docs, rows, edges, questions = [read(n) for n in ["van_ban", "dieu_khoan", "quan_he", "questions"]]
    store = LawStore(DATA)
    by = {r["id"]: r for r in rows}
    vd = {v["so_hieu"]: v for v in docs}
    errors, spans_count, gold_count, stale_count = [], 0, 0, 0

    def check(ok, why):
        if not ok:
            errors.append(why)

    check(15 <= len(docs) <= 30, "Document count outside contract")
    check(len(by) == len(rows), "Duplicate provision IDs")
    pages_by_doc = {}
    for doc, expected in zip(docs, EXPECTED_ARTICLES, strict=True):
        number = doc["so_hieu"]
        check(official(doc["nguon_url"]), "Non-government metadata: " + number)
        source = DATA / "pdf" / doc.get("file_ky_so", doc["file"])
        check(hashlib.sha256(source.read_bytes()).hexdigest() == doc["sha256"], "Original hash: " + number)
        for part in doc.get("pdf_parts", []):
            check(official(part["url"]), "Non-government PDF: " + number)
            check(hashlib.sha256((DATA / "pdf" / part["file"]).read_bytes()).hexdigest() == part["sha256"], "Part hash: " + number)
        for k in ["ngay_ban_hanh", "hieu_luc_tu"]:
            date.fromisoformat(doc[k])
        pages_by_doc[number] = json.loads((DATA / "pages" / (slug(number) + ".json")).read_text(encoding="utf-8"))
        articles = {r["dieu"] for r in rows if r["so_hieu"] == number}
        check(articles == {str(i) for i in range(1, expected + 1)}, "Article coverage: " + number)
    for r in rows:
        pages = pages_by_doc[r["so_hieu"]]
        fragments = []
        for span in r["page_spans"]:
            p = pages[span["trang"] - 1]
            check(0 <= span["start"] < span["end"] <= len(p["text"]), "Invalid span: " + r["id"])
            fragments.append(normal(p["text"][span["start"]:span["end"]]))
            spans_count += 1
        check(" ".join(fragments) == r["noi_dung"], "Source text differs: " + r["id"])
    for e in edges:
        check(e["tu_id"] in by or e["tu_id"] in vd, "Dangling source: " + e["tu_id"])
        check(e["den_id"] in by or e["den_id"] in vd, "Dangling target: " + e["den_id"])
        check(e["cau_trich"] in by[e["can_cu_id"]]["noi_dung"], "Graph evidence mismatch")
        date.fromisoformat(e["hieu_luc_tu"])
    check(len(questions) == 20, "Expected 20 QA cases")
    check(sum(q["bay_luat_cu"] for q in questions) >= 5, "Fewer than 5 traps")
    for q in questions:
        for pid in q["dieu_dung"]:
            status = store.status(pid, q["ngay_ap_dung"])
            check(status.in_force, q["id"] + " gold not current: " + pid + " " + status.reason)
            gold_count += 1
        answer = {"tra_loi": q["dap_an_tham_chieu"], "trich_dan": q["trich_dan_mau"], "checklist": []}
        for problem in code_checks(store, answer, q["ngay_ap_dung"]):
            errors.append(q["id"] + ": " + problem)
        for pid in q["dieu_cu_can_loai"]:
            check(not store.status(pid, q["ngay_ap_dung"]).in_force, q["id"] + " stale accepted: " + pid)
            stale_count += 1
    return {"ngay_dong_bang": "2026-11-03", "so_van_ban": len(docs), "so_muc_dieu_khoan": len(rows),
            "so_dieu": sum(len({r['dieu'] for r in rows if r['so_hieu'] == v['so_hieu']}) for v in docs),
            "so_quan_he": len(edges), "loai_quan_he": dict(Counter(e["loai"] for e in edges)),
            "so_trang_nguon": sum(len(p) for p in pages_by_doc.values()), "so_doan_trang_da_kiem": spans_count,
            "so_cau_hoi": len(questions), "so_cau_bay": sum(q["bay_luat_cu"] for q in questions),
            "so_can_cu_dap_an_da_kiem": gold_count, "so_can_cu_cu_da_thu_loai": stale_count,
            "so_muc_ocr_chua_duyet": sum(r["can_duyet_ocr"] for r in rows), "loi": errors,
            "phap_ly_da_duoc_nguoi_ky_duyet": False, "da_chay_spark_vs_rag": False}


def main():
    report = audit()
    dump("audit_report", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["loi"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
