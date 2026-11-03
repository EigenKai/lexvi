"""Verification of an answer before it reaches the user, outside the agent's control.

Two layers, in order:
1. Code checks (cheap, exact): every cited provision exists, applies on the asked date,
   and the quoted sentence is verbatim in its text; every checklist item cites a
   provision that was cited in the answer.
2. Spark as judge: for each citation, does the quote actually support the claim made?
The agent gets the list of problems back and may fix them; see agent.py for the limit.
"""

from __future__ import annotations

import re

from openai import OpenAI

from .config import ask_json
from .store import LawStore

_SPACE = re.compile(r"\s+")
_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"',
                         "–": "-", "—": "-", " ": " "})
MIN_QUOTE_CHARS = 12


def normalize(text: str) -> str:
    return _SPACE.sub(" ", (text or "").translate(_QUOTES)).strip().lower()


def citation_problems(store: LawStore, c: dict, on: str, i: int = 1) -> list[str]:
    """Exact checks for one citation: exists, applies on `on`, quote verbatim, claim stated."""
    pid, quote = str(c.get("id", "")), str(c.get("cau_trich", ""))
    p = store.provision(pid)
    if p is None:
        return [f"Trích dẫn {i}: không có điều khoản '{pid}' trong kho."]
    problems = []
    status = store.status(pid, on)
    if not status.in_force:
        hint = f" Hãy tra {', '.join(status.replaced_by)}." if status.replaced_by else ""
        problems.append(f"Trích dẫn {i} ({pid}): không áp dụng ngày {on}: {status.reason}.{hint}")
    if len(normalize(quote)) < MIN_QUOTE_CHARS:
        problems.append(f"Trích dẫn {i} ({pid}): câu trích quá ngắn, phải chép nguyên văn một câu.")
    elif normalize(quote) not in normalize(p["noi_dung"]):
        problems.append(f"Trích dẫn {i} ({pid}): câu trích không có nguyên văn trong điều khoản.")
    if not str(c.get("nhan_dinh", "")).strip():
        problems.append(f"Trích dẫn {i} ({pid}): thiếu nhận định mà câu trích chứng minh.")
    return problems


def code_checks(store: LawStore, answer: dict, on: str) -> list[str]:
    problems = []
    if not str(answer.get("tra_loi", "")).strip():
        problems.append("Câu trả lời trống.")
    citations = answer.get("trich_dan") or []
    if not citations:
        problems.append("Câu trả lời không có trích dẫn nào. Phải dẫn ít nhất một điều khoản.")
    cited = set()
    for i, c in enumerate(citations, 1):
        problems += citation_problems(store, c, on, i)
        cited.add(str(c.get("id", "")))
    for j, item in enumerate(answer.get("checklist") or [], 1):
        basis = str(item.get("can_cu", ""))
        if basis not in cited:
            problems.append(f"Việc {j} trong checklist: căn cứ '{basis}' phải là một điều khoản đã trích dẫn.")
    return problems


JUDGE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "ket_qua": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "so_thu_tu": {"type": "integer"},
                    "ung_ho": {"type": "boolean"},
                    "ly_do": {"type": "string"},
                },
                "required": ["so_thu_tu", "ung_ho", "ly_do"],
            },
        },
        "tong_the": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"ung_ho": {"type": "boolean"}, "ly_do": {"type": "string"}},
            "required": ["ung_ho", "ly_do"],
        },
    },
    "required": ["ket_qua", "tong_the"],
}


def judge(client: OpenAI, store: LawStore, answer: dict) -> list[str]:
    """Ask Spark whether each provision's full text supports the claim attached to it."""
    citations = answer.get("trich_dan") or []
    blocks = []
    for i, c in enumerate(citations, 1):
        p = store.provision(str(c.get("id", "")))
        blocks.append(
            f"[{i}] Nhận định: {c.get('nhan_dinh', '')}\n"
            f"Điều khoản {c.get('id')} ({p['so_hieu'] if p else '?'}):\n{p['noi_dung'] if p else ''}"
        )
    checklist = "\n".join(f"- {t.get('viec')} | hạn: {t.get('han') or 'không ghi'} | căn cứ: {t.get('can_cu')}"
                          for t in answer.get("checklist") or [])
    prompt = (
        "Bạn là người kiểm tra trích dẫn pháp luật thuế. Chỉ dựa vào chữ trong các điều khoản, không dùng hiểu "
        "biết bên ngoài.\n(1) ket_qua: với từng mục, nội dung điều khoản có trực tiếp ủng hộ nhận định không. "
        "Nhận định suy diễn quá chữ, sai con số hoặc sai đối tượng thì ung_ho=false. Trả đủ một kết quả cho mỗi mục.\n"
        "(2) tong_the: câu trả lời cuối và checklist (nhất là các hạn) có khớp với các điều khoản không; "
        "kết luận ngược điều khoản hoặc hạn không có trong điều khoản thì ung_ho=false.\n\n"
        + "\n\n".join(blocks)
        + f"\n\nCÂU TRẢ LỜI CUỐI: {answer.get('tra_loi', '')}\nCHECKLIST:\n{checklist or '(trống)'}"
    )
    result = ask_json(client, prompt, JUDGE_SCHEMA, "kiem_tra_trich_dan")
    problems = [f"Trích dẫn {v['so_thu_tu']}: điều khoản không ủng hộ nhận định ({v['ly_do']})."
                for v in result["ket_qua"] if not v["ung_ho"]]
    judged = {v["so_thu_tu"] for v in result["ket_qua"]}
    problems += [f"Trích dẫn {i}: chưa được kiểm, hãy nộp lại." for i in range(1, len(citations) + 1)
                 if i not in judged]
    if not result["tong_the"]["ung_ho"]:
        problems.append(f"Câu trả lời hoặc checklist không khớp điều khoản: {result['tong_the']['ly_do']}")
    return problems


def verify(client: OpenAI, store: LawStore, answer: dict, on: str, use_judge: bool = True) -> list[str]:
    problems = code_checks(store, answer, on)
    if problems or not use_judge:  # do not pay for the judge while exact checks still fail
        return problems
    return judge(client, store, answer)
