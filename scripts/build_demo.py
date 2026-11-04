"""Prepare a labelled historical replay of the 141/2026 amendment."""
import json
import shutil
from pathlib import Path

from lexvi.store import LawStore
from scripts.fetch_official import DATA, ROOT, slug


def main():
    read = lambda n: json.loads((DATA / (n + ".json")).read_text(encoding="utf-8"))
    docs, rows, edges = [read(n) for n in ["van_ban", "dieu_khoan", "quan_he"]]
    demo = ROOT / "demo" / "role_a"
    demo.mkdir(parents=True, exist_ok=True)
    base = {"68/2026/NĐ-CP", "109/2025/QH15", "149/2025/QH15", "09/2026/QH16"}
    for stage, selected in [("before", base), ("after", base | {"141/2026/NĐ-CP"})]:
        dest = demo / stage
        (dest / "pages").mkdir(parents=True, exist_ok=True)
        chosen = [r for r in rows if r["so_hieu"] in selected]
        endpoints = selected | {r["id"] for r in chosen}
        contents = {"van_ban": [v for v in docs if v["so_hieu"] in selected], "dieu_khoan": chosen,
                    "quan_he": [e for e in edges if e["tu_id"] in endpoints and e["den_id"] in endpoints]}
        for name, data in contents.items():
            (dest / (name + ".json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for number in selected:
            name = slug(number) + ".json"
            shutil.copy2(DATA / "pages" / name, dest / "pages" / name)
    new_doc = next(v for v in docs if v["so_hieu"] == "141/2026/NĐ-CP")
    shutil.copy2(DATA / "pdf" / new_doc["file"], demo / "van-ban-moi-141-2026.pdf")
    expected = {
        "che_do": "PHAT_LAI_LICH_SU_KHONG_PHAI_VAN_BAN_MOI_VUA_BAN_HANH_HOM_NAY",
        "moc_truoc": "2026-04-28", "moc_sau": "2026-04-30", "ngay_ap_dung": "2026-04-01",
        "ho_so": {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 700000000, "dia_ban": "TP.HCM"},
        "van_ban_moi": new_doc["so_hieu"], "ngay_ban_hanh": new_doc["ngay_ban_hanh"], "hieu_luc_tu": new_doc["hieu_luc_tu"],
        "dieu_bi_anh_huong": ["68-2026-ND-CP-D3-K1", "68-2026-ND-CP-D4-K1", "68-2026-ND-CP-D8-K1"],
        "can_cu_moi": ["141-2026-ND-CP-D1-K1", "141-2026-ND-CP-D3", "141-2026-ND-CP-D4-K1"],
        "viec_goi_y": [{"viec": "Đối chiếu doanh thu năm và các khoản GTGT/TNCN đã kê khai, nộp để kiểm tra xử lý số thuế nộp thừa theo Điều 4 khoản 1 Nghị định 141 và Điều 12 Nghị định 68.",
                        "han": None, "ly_do_han": "Không bịa hạn: khoản 1 Điều 4 không nêu một ngày hạn cố định.", "can_xac_nhan": True}],
        "khong_ket_luan": ["Tự động được hoàn toàn bộ tiền thuế", "Không còn nghĩa vụ thông báo doanh thu", "Tự suy ra hạn nộp hồ sơ từ ngày demo"]}
    (demo / "expected.json").write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    before, after = LawStore(demo / "before"), LawStore(demo / "after")
    old = expected["dieu_bi_anh_huong"][0]
    assert before.status(old, expected["ngay_ap_dung"]).in_force
    assert not after.status(old, expected["ngay_ap_dung"]).in_force
    assert after.status("141-2026-ND-CP-D1-K1", expected["ngay_ap_dung"]).in_force
    print("Historical demo snapshots verified (offline; no claim of live ingest/model evaluation).")


if __name__ == "__main__":
    main()
