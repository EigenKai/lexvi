"""Plain RAG baseline for the evaluation: same store, same model, no dates, no tools.

Retrieve the top-k provisions by BM25, paste them into one Spark call, ask for an answer
with citations. This is what most "chat with the tax law" tools do, and it is what LexVi
is measured against.
"""

from __future__ import annotations

import json

from openai import OpenAI

from .config import ask_json
from .store import LawStore

TOP_K = 6
SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {"tra_loi": {"type": "string"},
                   "trich_dan": {"type": "array", "items": {
                       "type": "object", "additionalProperties": False,
                       "properties": {"id": {"type": "string"}, "cau_trich": {"type": "string"},
                                      "nhan_dinh": {"type": "string"}},
                       "required": ["id", "cau_trich", "nhan_dinh"]}}},
    "required": ["tra_loi", "trich_dan"],
}


def ask(client: OpenAI, store: LawStore, cau_hoi: str, on: str, profile: dict) -> dict:
    ids = store.search(cau_hoi, limit=TOP_K)
    context = "\n\n".join(f"[{pid}] {store.provision(pid)['noi_dung']}" for pid in ids)
    prompt = (
        "Trả lời câu hỏi thuế dựa trên các điều khoản sau, trích dẫn id điều khoản và chép nguyên văn câu trích.\n\n"
        f"ĐIỀU KHOẢN:\n{context}\n\nCÂU HỎI: {cau_hoi}\nNgày áp dụng: {on}\n"
        f"Hồ sơ: {json.dumps(profile, ensure_ascii=False)}"
    )
    out = ask_json(client, prompt, SCHEMA, "tra_loi_rag")
    return {**out, "checklist": [], "can_xac_nhan": False, "retrieved": ids}
