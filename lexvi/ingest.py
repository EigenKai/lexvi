"""New-regulation flow (/ingest): a new legal PDF -> which stored provisions it changes ->
what that means for this business -> dated to-do items.

Spark reads the text and returns structured changes; the code then checks every claim
before it is shown: each excerpt must be verbatim in the PDF, each targeted provision must
exist in the store. Changes that fail are dropped and listed under `bi_loai`.
"""

from __future__ import annotations

import io
import json

from openai import OpenAI
from pypdf import PdfReader

from .config import ask_json
from .store import LawStore
from .verify import normalize

MAX_PDF_CHARS = 120_000

SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "van_ban_moi": {"type": "object", "additionalProperties": False,
                        "properties": {"so_hieu": {"type": "string"}, "tieu_de": {"type": "string"},
                                       "hieu_luc_tu": {"type": "string", "description": "YYYY-MM-DD"}},
                        "required": ["so_hieu", "tieu_de", "hieu_luc_tu"]},
        "thay_doi": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "trich_doan": {"type": "string", "description": "một câu chép nguyên văn từ văn bản mới"},
                "loai": {"type": "string", "enum": ["sua_doi", "thay_the", "bai_bo", "huong_dan"]},
                "dieu_bi_tac_dong": {"type": "string", "description": "id điều khoản trong danh sách kho"},
                "anh_huong_toi_ho_so": {"type": "boolean"},
                "giai_thich": {"type": "string"},
                "viec_can_lam": {"type": "string"},
                "han": {"type": "string", "description": "YYYY-MM-DD hoặc rỗng"}},
            "required": ["trich_doan", "loai", "dieu_bi_tac_dong", "anh_huong_toi_ho_so",
                         "giai_thich", "viec_can_lam", "han"]}},
    },
    "required": ["van_ban_moi", "thay_doi"],
}


def pdf_text(data: bytes) -> list[str]:
    """Text of each page. Scanned PDFs without a text layer come back empty."""
    reader = PdfReader(io.BytesIO(data))
    return [(page.extract_text() or "") for page in reader.pages]


def _catalog(store: LawStore) -> str:
    rows = store.db.execute("SELECT id, so_hieu, dieu, khoan, substr(noi_dung,1,160) AS t FROM dieu_khoan")
    return "\n".join(f"{r['id']} | {r['so_hieu']} Điều {r['dieu']} khoản {r['khoan']} | {r['t']}" for r in rows)


def analyze(client: OpenAI, store: LawStore, data: bytes, profile: dict) -> dict:
    pages = pdf_text(data)
    text = "\n".join(f"[trang {i}]\n{t}" for i, t in enumerate(pages, 1))[:MAX_PDF_CHARS]
    if len(normalize(text)) < 200:
        raise ValueError("PDF không có lớp chữ (bản scan); cần bản PDF có chữ")
    prompt = (
        "Văn bản pháp luật thuế mới dưới đây. Liệt kê từng thay đổi nó tạo ra với các điều khoản trong kho "
        "(danh sách id ở cuối). Với mỗi thay đổi: chép nguyên văn một câu của văn bản mới làm trich_doan, "
        "chọn đúng id điều khoản bị tác động trong danh sách kho, cho biết có ảnh hưởng tới hồ sơ cơ sở kinh "
        "doanh không, việc cần làm và hạn (chỉ khi văn bản nêu). Không bịa id ngoài danh sách. "
        "Viết giai_thich và viec_can_lam bằng tiếng Việt có dấu đầy đủ.\n\n"
        f"HỒ SƠ: {json.dumps(profile, ensure_ascii=False)}\n\nVĂN BẢN MỚI:\n{text}\n\n"
        f"DANH SÁCH ĐIỀU KHOẢN TRONG KHO:\n{_catalog(store)}"
    )
    result = ask_json(client, prompt, SCHEMA, "phan_tich_van_ban_moi", effort="medium")
    return check(store, result, text)


def check(store: LawStore, result: dict, text: str) -> dict:
    full = normalize(text)
    kept, dropped = [], []
    for change in result["thay_doi"]:
        target = store.provision(change["dieu_bi_tac_dong"])
        if target is None:
            dropped.append({**change, "ly_do": "điều bị tác động không có trong kho"})
        elif normalize(change["trich_doan"]) not in full:
            dropped.append({**change, "ly_do": "trích đoạn không có nguyên văn trong văn bản mới"})
        else:
            kept.append({**change, "dieu_cu": {"id": target["id"], "so_hieu": target["so_hieu"],
                                               "noi_dung": target["noi_dung"]}})
    affected = [c for c in kept if c["anh_huong_toi_ho_so"]]
    return {
        "van_ban_moi": result["van_ban_moi"],
        "dieu_bi_anh_huong": kept,
        "viec_can_lam": [{"viec": c["viec_can_lam"], "han": c["han"], "can_cu": c["dieu_bi_tac_dong"],
                          "trich_doan": c["trich_doan"]} for c in affected if c["viec_can_lam"]],
        "bi_loai": dropped,
        "can_xac_nhan": True,  # a new regulation is always confirmed by an accountant before acting
    }
