"""Reviewed legal-date exceptions and explicit amendment edges for the demo scope.

Additions never invalidate unchanged provisions. Partial amendments conservatively
invalidate a whole stored clause as-written; they do not invalidate sibling clauses.
Every edge retains a source provision and verbatim evidence.
"""
import json
import re
from scripts.build_data import dump
from scripts.fetch_official import DATA

QA_NOTE = "Thêm bởi QA vai trò C — chờ Dũng duyệt"
# Decree 70/2025 Art. 1 items: "N. <verbs and targets> như sau:".
_TOKEN = re.compile(r"sửa đổi tên|sửa đổi, bổ sung|sửa đổi|bổ sung|vào sau|vào|điểm \w+|khoản \w+|Điều \w+", re.I)


def item_header(text):
    """The verbatim heading of an amending item, up to and including "như sau:"."""
    return text[:text.index("như sau:") + len("như sau:")]


def decree70_targets(by, prefix="70-2025-ND-CP-D1-K", target_doc="123-2020-ND-CP"):
    """Edges from each numbered item of Decree 70 Art. 1 to the provisions of Decree 123 it edits.

    Read from the item's own heading. Scope: "toan_muc" when a whole clause or article is
    rewritten, "mot_phan" when only points (điểm) of a clause change, "bo_sung" when something is
    only added into a clause or article. A name-only change of an article, and a new article
    inserted after another, target no existing stored text and are skipped (listed).
    """
    found, skipped = [], []
    k = 1
    while prefix + str(k) in by:
        source = prefix + str(k)
        header = item_header(by[source]["noi_dung"])
        verb, into, after, into_clause, points, pending = None, False, False, False, False, []
        for token in (t.lower() for t in _TOKEN.findall(header)):
            kind, _, number = token.partition(" ")
            if token in ("sửa đổi tên", "sửa đổi, bổ sung", "sửa đổi", "bổ sung"):
                verb, into, after, into_clause, points = token, False, False, False, False
            elif token in ("vào", "vào sau"):
                into, after = True, token == "vào sau"
            elif kind == "điểm":
                points = True
            elif kind == "khoản":
                if verb == "bổ sung":
                    if into:  # the clause something is added into (or after: then the article)
                        pending.append((None if after else number, "bo_sung"))
                        into_clause = True
                else:
                    pending.append((number, "mot_phan" if points else "toan_muc"))
                points = False
            elif kind == "điều":
                if verb == "sửa đổi tên":
                    skipped.append((source, f"đổi tên Điều {number}: không tạo cạnh riêng cho tên điều"))
                elif verb == "bổ sung" and not into:
                    pass  # a new article ("Bổ sung Điều 22a"); its anchor follows "vào sau"
                elif verb == "bổ sung" and after and not into_clause:
                    skipped.append((source, f"thêm điều mới sau Điều {number}, không sửa văn bản đã lưu"))
                elif verb == "bổ sung" and not into_clause:
                    pending.append((None, "bo_sung"))
                elif verb != "bổ sung" and not pending:
                    pending.append((None, "toan_muc"))
                for clause, scope in pending:
                    target = f"{target_doc}-D{number}" + (f"-K{clause}" if clause else "")
                    if target in by:
                        found.append((source, target, scope))
                    else:
                        skipped.append((source, f"không có {target} trong kho"))
                pending = []
        k += 1
    return found, skipped


def main():
    docs = json.loads((DATA / "sources.json").read_text(encoding="utf-8"))
    rows = json.loads((DATA / "dieu_khoan.json").read_text(encoding="utf-8"))
    by = {r["id"]: r for r in rows}
    vd = {v["so_hieu"]: v for v in docs}
    edges = []
    endings = {"38/2019/QH14": "2026-07-01", "123/2020/NĐ-CP": "2026-07-01",
               "70/2025/NĐ-CP": "2026-07-01", "32/2025/TT-BTC": "2026-07-01",
               "40/2021/TT-BTC": "2026-03-05", "100/2021/TT-BTC": "2026-03-05",
               "204/2025/QH15": "2027-01-01", "174/2025/NĐ-CP": "2027-01-01"}
    for v in docs:
        v["het_hieu_luc"] = endings.get(v["so_hieu"])
        v["pham_vi"] = "Kho có giới hạn cho demo F&B; không phải danh mục đầy đủ pháp luật thuế."
        v["can_cu_het_hieu_luc"] = {
            "38/2019/QH14": "108-2025-QH15-D52-K3",
            "123/2020/NĐ-CP": "254-2026-ND-CP-D43-K2",
            "70/2025/NĐ-CP": "254-2026-ND-CP-D43-K2",
            "32/2025/TT-BTC": "91-2026-TT-BTC-D25-K2",
            "40/2021/TT-BTC": "18-2026-TT-BTC-D9-K2",
            "100/2021/TT-BTC": "18-2026-TT-BTC-D9-K2",
            "204/2025/QH15": "204-2025-QH15-D2",
            "174/2025/NĐ-CP": "174-2025-ND-CP-D2-K1",
        }.get(v["so_hieu"])
    for r in rows:
        r["het_hieu_luc"] = vd[r["so_hieu"]].get("het_hieu_luc")
        r["can_cu_het_hieu_luc"] = vd[r["so_hieu"]].get("can_cu_het_hieu_luc")
        if (r["so_hieu"] == "48/2024/QH15" and (r["id"].startswith("48-2024-QH15-D5-K25") or r["dieu"] == "17")):
            r.update(hieu_luc_tu="2026-01-01", can_cu_hieu_luc="48-2024-QH15-D18-K2")
        if r["so_hieu"] == "109/2025/QH15" and r["dieu"] == "7":
            r.update(hieu_luc_tu="2026-01-01", can_cu_hieu_luc="109-2025-QH15-D29-K2", ky_tinh_thue=[2026])
        if r["so_hieu"] == "108/2025/QH15" and r["dieu"] == "13":
            r.update(hieu_luc_tu="2026-01-01", can_cu_hieu_luc="108-2025-QH15-D52-K2")
        if r["so_hieu"] == "09/2026/QH16" and r["dieu"] in ["1", "2", "3"]:
            r.update(hieu_luc_tu="2026-01-01", can_cu_hieu_luc="09-2026-QH16-D5-K2")
        if r["id"] in ["198-2025-QH15-D10-K6", "198-2025-QH15-D10-K7"]:
            r["hieu_luc_tu"] = "2026-01-01"
        if r["so_hieu"] in ["43/2026/QH16", "398/2026/NĐ-CP"]:
            r["ky_tinh_thue"] = [2026, 2027]

    def edge(source, target, kind="sua_doi", start=None, scope="toan_muc", quote=None, note=""):
        assert source in by, source
        assert target in by or target in vd, target
        p = by[source]
        if quote is None:
            quote = p["noi_dung"]
        assert quote in p["noi_dung"], source
        e = {"tu_id": source, "den_id": target, "loai": kind,
             "hieu_luc_tu": start or p["hieu_luc_tu"], "pham_vi": scope,
             "can_cu_id": source, "cau_trich": quote, "trang": p["trang"],
             "ngay_ban_hanh": vd[p["so_hieu"]]["ngay_ban_hanh"], "ghi_chu": note,
             "kiem_duyet": "doi_chieu_bang_agent_chua_ky_duyet_boi_nguoi"}
        if not any(all(x[k] == e[k] for k in ["tu_id", "den_id", "loai"]) for x in edges):
            edges.append(e)

    edge("90-2025-QH15-D4", "48-2024-QH15-D9-K1", scope="mot_phan", note="Sửa điểm a, giữ các điểm khác; bản khoản cũ không còn nguyên trạng.")
    for target in ["48-2024-QH15-D5-K1", "48-2024-QH15-D5-K25"]:
        edge("149-2025-QH15-D1-K1", target)
    edge("149-2025-QH15-D1-K2", "48-2024-QH15-D9-K5")
    for target in ["48-2024-QH15-D12-K3", "48-2024-QH15-D15-K9"]:
        edge("149-2025-QH15-D1-K3", target, "bai_bo", scope="mot_phan" if "D15" in target else "toan_muc")
    edge("09-2026-QH16-D1", "109-2025-QH15-D7-K1")
    edge("09-2026-QH16-D2", "48-2024-QH15-D5-K25")
    edge("09-2026-QH16-D2", "149-2025-QH15-D1-K1", scope="mot_phan", note="Chỉ phần điểm b về khoản 25; phần điểm a cần đọc riêng khi bổ sung điểm.")
    edge("09-2026-QH16-D3", "67-2025-QH15-D4", scope="bo_sung")
    for target in ["D3", "D4", "D8-K1", "D9", "D10", "D11-K3", "D12-K1", "D12-K2", "D17-K4", "D18-K3"]:
        edge("141-2026-ND-CP-D1-K1", "68-2026-ND-CP-" + target, scope="thay_cum_tu",
             note="Thay cụm 500 triệu bằng 01 tỷ, hiệu lực hồi tố theo Điều 3. Phạm vi thay_cum_tu: "
                  "phần còn lại của khoản cũ vẫn áp dụng khi đọc kèm khoản 1 Điều 1 Nghị định 141. " + QA_NOTE)
    edge("141-2026-ND-CP-D1-K2", "68-2026-ND-CP-D8-K5")
    edge("141-2026-ND-CP-D2", "320-2025-ND-CP-D4", scope="bo_sung")
    edge("50-2026-TT-BTC-D1", "18-2026-TT-BTC-D1")
    edge("50-2026-TT-BTC-D2", "18-2026-TT-BTC-D5-K2")
    edge("50-2026-TT-BTC-D3", "18-2026-TT-BTC-D4", "dan_chieu", note="Thay mẫu biểu ở phụ lục; không bãi bỏ toàn Điều 4.")
    edge("50-2026-TT-BTC-D4-K2", "18-2026-TT-BTC-D4-K1", "huong_dan", note="Hạn chuyển tiếp riêng cho nhóm được mô tả; không áp cho mọi hộ.")
    for target in ["40/2021/TT-BTC", "100/2021/TT-BTC"]:
        edge("18-2026-TT-BTC-D9-K2", target, "thay_the")
    for source, target, scope in [("1", "D7-K3", "toan_muc"), ("2", "D8-K1", "mot_phan"), ("3", "D9-K1", "mot_phan"), ("4", "D17", "bo_sung"), ("5", "D18", "bo_sung")]:
        edge("100-2021-TT-BTC-D1-K" + source, "40-2021-TT-BTC-" + target, scope=scope)
    edge("198-2025-QH15-D10-K6", "38-2019-QH14-D51", "bai_bo", start="2026-01-01", note="Đối chiếu thêm Điều 52 khoản 3 Luật 108.")
    edge("108-2025-QH15-D52-K3", "38/2019/QH14", "thay_the", start="2026-07-01", note="Ngoại lệ chuyển tiếp tại Điều 53 khoản 1,3; không tự áp cho vụ việc tồn đọng.")
    for target in ["123/2020/NĐ-CP", "70/2025/NĐ-CP"]:
        edge("254-2026-ND-CP-D43-K2", target, "thay_the")
    edge("70-2025-ND-CP-D1-K8", "123-2020-ND-CP-D11")
    targets, skipped = decree70_targets(by)
    for source, target, scope in targets:
        edge(source, target, start="2025-06-01", scope=scope, quote=item_header(by[source]["noi_dung"]),
             note="Sinh từ tiêu đề mục sửa đổi của Điều 1 Nghị định 70. " + QA_NOTE)
    for source, why in skipped:
        print("Bỏ qua", source, "-", why)
    edge("91-2026-TT-BTC-D25-K2", "32/2025/TT-BTC", "thay_the")
    edge("359-2025-ND-CP-D1-K1", "181-2025-ND-CP-D4", scope="bo_sung")
    for target in ["181-2025-ND-CP-D37-K3", "181-2025-ND-CP-D39-K3"]:
        edge("359-2025-ND-CP-D1-K2", target, "bai_bo")
    for source, target, scope in [("D1-K1", "D4", "bo_sung"), ("D1-K2", "D4-K4", "mot_phan"), ("D1-K3", "D4-K14", "toan_muc"), ("D2", "D9-K1", "mot_phan"), ("D3-K1", "D23-K2", "mot_phan"), ("D3-K2", "D23-K2", "bo_sung"), ("D4", "D26-K2", "mot_phan")]:
        edge("144-2026-ND-CP-" + source, "181-2025-ND-CP-" + target, scope=scope)
    for source, target in [("181-2025-ND-CP-D1", "48/2024/QH15"),
                           ("174-2025-ND-CP-D1-K1", "204-2025-QH15-D1-K1"),
                           ("20-2026-ND-CP-D1", "198/2025/QH15"),
                           ("320-2025-ND-CP-D1", "67/2025/QH15"),
                           ("18-2026-TT-BTC-D1", "68/2026/NĐ-CP"),
                           ("254-2026-ND-CP-D1", "108/2025/QH15"),
                           ("252-2026-ND-CP-D1", "108/2025/QH15"),
                           ("91-2026-TT-BTC-D1", "254/2026/NĐ-CP"),
                           ("398-2026-ND-CP-D1", "43/2026/QH16")]:
        edge(source, target, "huong_dan")
    # Cross-references are informational only; do not infer amendments from a mention.
    pattern = re.compile(r"\b\d{1,3}/\d{4}/(?:QH\d+|NĐ-\s*CP|TT-\s*BTC)\b")
    for r in rows:
        for m in pattern.finditer(r["noi_dung"]):
            number = re.sub(r"\s+", "", m[0])
            if number in vd and number != r["so_hieu"]:
                edge(r["id"], number, "dan_chieu", quote=m[0])
    dump("van_ban", docs)
    dump("dieu_khoan", rows)
    dump("quan_he", edges)
    print(len(rows), "provisions;", len(edges), "edges")


if __name__ == "__main__":
    main()
