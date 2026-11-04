"""New-regulation flow (/ingest): a new legal PDF -> which stored provisions it changes ->
what that means for this business -> dated to-do items.

Spark reads the text and returns structured changes; the code then checks every claim
before it is shown: each excerpt must be verbatim in the PDF, each targeted provision must
exist in the store. Changes that fail are dropped and listed under `bi_loai`.

Only a short list of candidate provisions goes into the prompt: those of the documents the
new text names, and the best full-text matches for its amending sentences.
"""

from __future__ import annotations

import io
import json
import re

from openai import OpenAI
from pypdf import PdfReader

from .config import ask_json
from .store import LawStore
from .verify import MIN_QUOTE_CHARS, normalize

MAX_PDF_CHARS = 120_000
MAX_CANDIDATES = 100
# Document numbers, tolerant of the spaces pypdf inserts ("68/2026/NĐ- CP", "N Đ-CP").
_DOC_NUMBER = re.compile(r"(\d{1,3})\s*/\s*(\d{4})\s*/\s*(Q\s*H\s*\d+|N\s*Đ\s*-\s*C\s*P|T\s*T\s*-\s*B\s*T\s*C)", re.I)
_OWN_NUMBER = re.compile(r"Số\s*:\s*$", re.I)
_AMENDING = re.compile(r"sửađổi|bổsung|bãibỏ|thaythế")
_SENTENCE = re.compile(r"(?<=[.;:])\s+")

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


class BadPdf(Exception):
    """The upload is not a readable PDF (the client's fault, not the model's)."""


def pdf_text(data: bytes) -> list[str]:
    """Text of each page. Scanned PDFs without a text layer come back empty."""
    try:
        reader = PdfReader(io.BytesIO(data))
        return [(page.extract_text() or "") for page in reader.pages]
    except Exception as error:  # pypdf raises many types for broken files
        raise BadPdf(f"Không đọc được file PDF ({type(error).__name__})") from error


def _squash(text: str) -> str:
    """Normalised text without any whitespace: pypdf splits Vietnamese syllables ("01 t ỷ đồng")."""
    return re.sub(r"\s+", "", normalize(text))


def _doc_numbers(text: str) -> list[str]:
    """Document numbers named in the text, in order, without the document's own "Số: ..." number."""
    found = []
    for m in _DOC_NUMBER.finditer(text):
        if _OWN_NUMBER.search(text[max(0, m.start() - 12):m.start()]):
            continue
        found.append(re.sub(r"\s+", "", f"{m[1]}/{m[2]}/{m[3]}").upper())
    return list(dict.fromkeys(found))


def _candidates(store: LawStore, text: str) -> list[str]:
    """At most MAX_CANDIDATES provision ids the new text may change, most likely first."""
    if store.count() <= MAX_CANDIDATES:
        return [r["id"] for r in store.catalog()]
    named = [n for n in _doc_numbers(text) if store.document(n)]
    hits = []
    for sentence in _SENTENCE.split(text):
        if _AMENDING.search(_squash(sentence)):
            hits += store.search(sentence[:400], limit=10)
    in_named = [pid for pid in hits if (store.provision(pid) or {}).get("so_hieu") in named]
    of_named = [p["id"] for n in named for p in store.provisions_of(n)]
    return list(dict.fromkeys(in_named + of_named + hits))[:MAX_CANDIDATES]


def _catalog(store: LawStore, ids: list[str] | None = None) -> str:
    return "\n".join(f"{r['id']} | {r['so_hieu']} Điều {r['dieu']} khoản {r['khoan']} | {r['t']}"
                     for r in store.catalog(ids))


def analyze(client: OpenAI, store: LawStore, data: bytes, profile: dict) -> dict:
    pages = pdf_text(data)
    if len(normalize("".join(pages))) < 200:  # measured without page markers
        raise ValueError("PDF không có lớp chữ (bản scan); cần bản PDF có chữ")
    plain = "\n".join(pages)
    text = "\n".join(f"[trang {i}]\n{t}" for i, t in enumerate(pages, 1))[:MAX_PDF_CHARS]
    prompt = (
        "Văn bản pháp luật thuế mới dưới đây. Liệt kê từng thay đổi nó tạo ra với các điều khoản trong kho "
        "(danh sách id ở cuối). Với mỗi thay đổi: chép nguyên văn một câu của văn bản mới làm trich_doan, "
        "chọn đúng id điều khoản bị tác động trong danh sách kho, cho biết có ảnh hưởng tới hồ sơ cơ sở kinh "
        "doanh không, việc cần làm và hạn (chỉ khi văn bản nêu). Không bịa id ngoài danh sách. "
        "Viết giai_thich và viec_can_lam bằng tiếng Việt có dấu đầy đủ.\n\n"
        f"HỒ SƠ: {json.dumps(profile, ensure_ascii=False)}\n\nVĂN BẢN MỚI:\n{text}\n\n"
        f"DANH SÁCH ĐIỀU KHOẢN TRONG KHO:\n{_catalog(store, _candidates(store, plain))}"
    )
    result = ask_json(
        client, prompt, SCHEMA, "phan_tich_van_ban_moi", effort="medium", max_output_tokens=24000
    )
    return check(store, result, plain)


def check(store: LawStore, result: dict, text: str) -> dict:
    """`text` is the new document's text without page markers, so excerpts may cross pages."""
    full = _squash(text)
    kept, dropped = [], []
    for change in result["thay_doi"]:
        target = store.provision(change["dieu_bi_tac_dong"])
        if target is None:
            dropped.append({**change, "ly_do": "điều bị tác động không có trong kho"})
        elif len(normalize(change["trich_doan"])) < MIN_QUOTE_CHARS:
            dropped.append({**change, "ly_do": "trích đoạn quá ngắn để đối chiếu"})
        elif _squash(change["trich_doan"]) not in full:
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
