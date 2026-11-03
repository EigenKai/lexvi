"""Readable inventories and reference answers derived from the shipped JSON."""
import csv
import json
from pathlib import Path

from scripts.fetch_official import DATA, ROOT


def main():
    docs = json.loads((DATA / "van_ban.json").read_text(encoding="utf-8"))
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    lines = ["# Nguồn dữ liệu LexVi — vai A", "",
             "Đối chiếu 03/11/2026. Chỉ nguồn chính thức. Văn bản cũ được giữ để tra lịch sử; không phải mọi bản gốc đều còn hiệu lực.", "",
             "Ngày kết thúc là điểm loại trừ; bản ký số/Công báo và hash đầy đủ ở `sources.json`, `van_ban.json`.", "",
             "| Số hiệu | Văn bản | Ban hành | Hiệu lực mặc định | Kết thúc | Nguồn | PDF chữ |", "|---|---|---|---|---|---|---|"]
    for v in docs:
        text_source = v.get("nguon_toan_van", v["pdf_url"])
        lines.append(f"| {v['so_hieu']} | {v['tieu_de']} | {v['ngay_ban_hanh']} | {v['hieu_luc_tu']} | {v.get('het_hieu_luc') or '—'} | [Metadata]({v['nguon_url']}) | [Nguồn]({text_source}) |")
    lines += ["", "Ba văn bản scan 204, 43, 398 có bản chép phần chính văn đã được agent đối chiếu ảnh gốc.",
              "Trang phụ lục và mẫu biểu không được tính thành các điều/khoản trả lời.",
              "Ngày hiệu lực riêng và căn cứ kết thúc được giữ trên từng bản ghi; xem `data/README.md`.", "",
              "## Dấu vết bản gốc", ""]
    for v in docs:
        file = v.get("file_ky_so", v["file"])
        lines.append(f"- {v['so_hieu']}: `pdf/{file}` — SHA-256 `{v['sha256']}`.")
    (DATA / "SOURCES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    fields = ["so_hieu", "tieu_de", "ngay_ban_hanh", "hieu_luc_tu", "het_hieu_luc", "nguon_url", "pdf_url", "file", "sha256"]
    with (DATA / "sources.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(docs)
    lines = ["# 20 câu hỏi kiểm thử và đáp án tham chiếu — LexVi", "",
             "Mốc nguồn 03/11/2026. Có 11 câu bẫy luật cũ. Đây là đáp án được agent đối chiếu nguồn; chưa phải kết quả model hoặc người ký duyệt.", ""]
    for q in questions:
        lines.extend([f"## {q['id']}{' · Bẫy thời gian' if q['bay_luat_cu'] else ''}", "",
                      f"**Ngày áp dụng:** {q['ngay_ap_dung']} · **Loại hình:** {q['ho_so']['loai_hinh']}", "",
                      q["cau_hoi"], "", "**Đáp án:** " + q["dap_an_tham_chieu"], "", "**Căn cứ:**", ""])
        for c in q["trich_dan_mau"]:
            locations = ", ".join(f"[trang {x['trang']}]({x['nguon_pdf']})" for x in c["vi_tri_nguon"])
            lines.append(f"- `{c['id']}` — {locations}. Trích: “{c['cau_trich']}”")
        if q["dieu_cu_can_loai"]:
            lines.extend(["", "Căn cứ cũ phải loại: " + ", ".join(f"`{pid}`" for pid in q["dieu_cu_can_loai"]) + "."])
        if q["ghi_chu_cham"]:
            lines.extend(["", q["ghi_chu_cham"]])
        lines.append("")
    (ROOT / "docs" / "QA_ROLE_A.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Exported data/SOURCES.md, data/sources.csv, docs/QA_ROLE_A.md")


if __name__ == "__main__":
    main()
