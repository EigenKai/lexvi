"""Verification of an answer before it reaches the user, outside the agent's control.

Two layers, in order:
1. Code checks (cheap, exact): every cited provision exists, applies on the asked date,
   and the quoted sentence is verbatim in its text; every checklist item cites a
   provision that was cited in the answer.
2. Spark as judge: for each citation, does the quote actually support the claim made,
   and does the answer address the question that was asked?
The agent gets the list of problems back and may fix them; see agent.py for the limit.

A clause that is edited only in part (a phrase replacement or a point-level edit) is not
in force "as written", but it can still be cited when the answer also cites the clause
that edits it and that clause applies on the date (see `citable`).
"""

from __future__ import annotations

import re
import unicodedata

from openai import OpenAI

from .config import ask_json
from .store import LawStore

_SPACE = re.compile(r"\s+")
_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"',
                         "–": "-", "—": "-", " ": " "})
MIN_QUOTE_CHARS = 12
# A quote must not drop a negation that sits right in front of it.
_NEGATIONS = ("không ", "chưa ", "chẳng ")
_LETTER = re.compile(r"[^\W\d_]")
MIN_LETTERS_FOR_DIACRITICS_CHECK = 20


def normalize(text: str) -> str:
    return _SPACE.sub(" ", unicodedata.normalize("NFC", text or "").translate(_QUOTES)).strip().lower()


def is_verbatim(quote: str, text: str) -> bool:
    """The quote appears in the text as whole words: it starts and ends at a word boundary
    (so "00 triệu" cannot be cut out of "500 triệu") and is not directly preceded by a
    negation ("không phải nộp" cannot be quoted as "phải nộp").

    A quote may start mid-sentence: role A's reference citations do, and they are correct."""
    q, t = normalize(quote), normalize(text)
    if not q:
        return False
    start = t.find(q)
    while start >= 0:
        end = start + len(q)
        before = t[:start]
        starts_ok = start == 0 or not t[start - 1].isalnum() or not q[0].isalnum()
        ends_ok = end == len(t) or not t[end].isalnum() or not q[-1].isalnum()
        negated = before.endswith(_NEGATIONS)
        if starts_ok and ends_ok and not negated:
            return True
        start = t.find(q, start + 1)
    return False


def citable(store: LawStore, pid: str, on: str, cited: set | None = None) -> bool:
    """Can this provision be cited for date `on` in an answer that cites `cited`?"""
    status = store.status(pid, on)
    if status.in_force:
        return True
    return bool(status.amended_by and cited is not None
                and all(a in cited and store.status(a, on).in_force for a in status.amended_by))


def citation_problems(store: LawStore, c: dict, on: str, i: int = 1, cited: set | None = None) -> list[str]:
    """Exact checks for one citation: exists, applies on `on`, quote verbatim, claim stated.

    `cited` is the set of provision ids cited in the same answer; it lets a partly amended
    clause pass when its amending clauses are cited too."""
    pid, quote = str(c.get("id", "")), str(c.get("cau_trich", ""))
    p = store.provision(pid)
    if p is None:
        return [f"Trích dẫn {i}: không có điều khoản '{pid}' trong kho."]
    problems = []
    status = store.status(pid, on)
    if not citable(store, pid, on, cited):
        if status.amended_by:
            hint = (f" Khoản này chỉ được trích khi trích kèm điều khoản sửa đổi nó "
                    f"({', '.join(status.amended_by)}) trong cùng câu trả lời.")
        else:
            hint = f" Hãy tra {', '.join(status.replaced_by)}." if status.replaced_by else ""
        problems.append(f"Trích dẫn {i} ({pid}): không áp dụng ngày {on}: {status.reason}.{hint}")
    if len(normalize(quote)) < MIN_QUOTE_CHARS:
        problems.append(f"Trích dẫn {i} ({pid}): câu trích quá ngắn, phải chép nguyên văn một câu.")
    elif not is_verbatim(quote, p["noi_dung"]):
        problems.append(f"Trích dẫn {i} ({pid}): câu trích không có nguyên văn trong điều khoản "
                        "(phải chép trọn câu hoặc trọn ý, từ đầu câu, không bỏ chữ phủ định).")
    elif p.get("page_spans"):
        locations = store.quote_locations(pid, quote)
        if not locations:
            problems.append(f"Trích dẫn {i} ({pid}): không định vị được câu trích trên trang nguồn.")
        elif c.get("trang") is not None and c["trang"] not in {x["trang"] for x in locations}:
            problems.append(f"Trích dẫn {i} ({pid}): số trang không chứa câu trích.")
    if not str(c.get("nhan_dinh", "")).strip():
        problems.append(f"Trích dẫn {i} ({pid}): thiếu nhận định mà câu trích chứng minh.")
    return problems


def lacks_diacritics(text: str) -> bool:
    """A Vietnamese answer of some length always has non-ASCII letters (ă, â, đ, ê, ô, ơ, ư, tones)."""
    letters = _LETTER.findall(text or "")
    return len(letters) >= MIN_LETTERS_FOR_DIACRITICS_CHECK and all(ch.isascii() for ch in letters)


def cited_ids(answer: dict) -> set:
    return {str(c.get("id", "")) for c in answer.get("trich_dan") or []}


def code_checks(store: LawStore, answer: dict, on: str) -> list[str]:
    problems = []
    if not str(answer.get("tra_loi", "")).strip():
        problems.append("Câu trả lời trống.")
    elif lacks_diacritics(str(answer.get("tra_loi", ""))):
        problems.append("Câu trả lời phải viết bằng tiếng Việt có dấu đầy đủ.")
    citations = answer.get("trich_dan") or []
    if not citations:
        problems.append("Câu trả lời không có trích dẫn nào. Phải dẫn ít nhất một điều khoản.")
    cited = cited_ids(answer)
    for i, c in enumerate(citations, 1):
        problems += citation_problems(store, c, on, i, cited)
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


def judge(client: OpenAI, store: LawStore, answer: dict, on: str | None = None, question: str = "") -> list[str]:
    """Ask Spark whether each provision's full text supports the claim attached to it, and whether
    the answer addresses the question. A partly amended clause is shown with its amending text."""
    citations = answer.get("trich_dan") or []
    blocks = []
    for i, c in enumerate(citations, 1):
        p = store.provision(str(c.get("id", "")))
        block = (f"[{i}] Nhận định: {c.get('nhan_dinh', '')}\n"
                 f"Điều khoản {c.get('id')} ({p['so_hieu'] if p else '?'}):\n{p['noi_dung'] if p else ''}")
        if p and on:
            for aid in store.status(p["id"], on).amended_by:
                a = store.provision(aid)
                if a:
                    block += (f"\nĐọc kèm điều khoản sửa đổi {aid} ({a['so_hieu']}), áp phần sửa đổi này "
                              f"vào điều khoản trên:\n{a['noi_dung']}")
        blocks.append(block)
    checklist = "\n".join(f"- {t.get('viec')} | hạn: {t.get('han') or 'không ghi'} | căn cứ: {t.get('can_cu')}"
                          for t in answer.get("checklist") or [])
    prompt = (
        "Bạn là người kiểm tra trích dẫn pháp luật thuế. Chỉ dựa vào chữ trong các điều khoản, không dùng hiểu "
        "biết bên ngoài.\n(1) ket_qua: với từng mục, nội dung điều khoản (đã áp phần sửa đổi đọc kèm, nếu có) có "
        "trực tiếp ủng hộ nhận định không. Nhận định suy diễn quá chữ, sai con số hoặc sai đối tượng thì "
        "ung_ho=false. Trả đủ một kết quả cho mỗi mục.\n"
        "(2) tong_the: câu trả lời cuối và checklist (nhất là các hạn) có khớp với các điều khoản không; "
        "kết luận ngược điều khoản hoặc hạn không có trong điều khoản thì ung_ho=false. Câu trả lời phải trả lời "
        "thẳng câu hỏi của người hỏi: trả lời né tránh, lạc đề, không nêu kết luận, hoặc không viết bằng tiếng Việt "
        "có dấu đầy đủ thì ung_ho=false.\n\n"
        + (f"CÂU HỎI CỦA NGƯỜI HỎI: {question}\n\n" if question else "")
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


def verify(client: OpenAI, store: LawStore, answer: dict, on: str, use_judge: bool = True,
           question: str = "") -> list[str]:
    problems = code_checks(store, answer, on)
    if problems or not use_judge:  # do not pay for the judge while exact checks still fail
        return problems
    return judge(client, store, answer, on, question)
