"""The agent's tools: DEFINITIONS (what Spark sees) and run() (what the code does).

Every lookup is answered from the law store with the validity on the asked date already
computed, so the model never has to guess whether a provision still applies.
nop_cau_tra_loi is the only way to finish; it runs verify.py and refuses with reasons.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from openai import OpenAI

from .store import LawStore
from .verify import citation_problems, lacks_diacritics, normalize, verify

MAX_REFUSALS = 3
SNIPPET_CHARS = 280
SEARCH_LIMIT = 6        # provisions in force on the asked date, per search
STALE_HITS = 2          # plus at most this many outdated hits that point to their replacement
MIN_SEARCHES_FOR_NO_BASIS = 2
_NO_BASIS = re.compile(r"(?:chưa|không) (?:tìm thấy|tìm được|có) căn cứ")


def _fn(name: str, description: str, properties: dict, required: list) -> dict:
    return {"type": "function", "name": name, "description": description,
            "parameters": {"type": "object", "additionalProperties": False,
                           "properties": properties, "required": required}}


_CITATION = {"type": "object", "additionalProperties": False,
             "properties": {"id": {"type": "string"},
                            "cau_trich": {"type": "string", "description": "một câu chép nguyên văn từ điều khoản"},
                            "nhan_dinh": {"type": "string", "description": "điều câu trích chứng minh"}},
             "required": ["id", "cau_trich", "nhan_dinh"]}
_TASK = {"type": "object", "additionalProperties": False,
         "properties": {"viec": {"type": "string"},
                        "han": {"type": "string", "description": "YYYY-MM-DD, hoặc chuỗi rỗng nếu luật không nêu hạn"},
                        "can_cu": {"type": "string", "description": "id điều khoản đã trích dẫn"}},
         "required": ["viec", "han", "can_cu"]}

DEFINITIONS = [
    _fn("tim_dieu_khoan", "Tìm điều khoản luật thuế theo từ khoá. Trả trước các điều khoản còn áp dụng vào ngày hỏi, "
        "sau đó tối đa 2 điều khoản không còn áp dụng nguyên văn kèm `xem_thay` (điều thay thế) hoặc `doc_kem` "
        "(điều sửa đổi phải trích kèm).", {"truy_van": {"type": "string"}}, ["truy_van"]),
    _fn("doc_dieu_khoan", "Đọc toàn văn một điều khoản theo id, kèm văn bản chứa nó và tình trạng hiệu lực vào ngày hỏi.",
        {"id": {"type": "string"}}, ["id"]),
    _fn("lan_chuoi_sua_doi", "Lần các quan hệ của một điều khoản: điều nào sửa đổi, thay thế, bãi bỏ, hướng dẫn nó, "
        "và nó sửa đổi điều nào.", {"id": {"type": "string"}}, ["id"]),
    _fn("doc_ho_so", "Đọc hồ sơ cơ sở kinh doanh của người hỏi (loại hình, ngành, doanh thu năm, địa bàn).", {}, []),
    _fn("nop_cau_tra_loi", "Nộp câu trả lời cuối. Bị từ chối nếu trích dẫn không tồn tại, không còn áp dụng vào ngày hỏi, "
        "câu trích không nguyên văn, điều khoản không ủng hộ nhận định, hoặc câu trả lời không trả lời thẳng câu hỏi. "
        "Kết quả từ chối nêu lý do để sửa. Điều khoản đã được sửa đổi một phần chỉ được trích khi trích kèm điều khoản "
        "sửa đổi nó (trường `doc_kem`). Nếu đã tìm kỹ mà kho không có căn cứ: nộp với trich_dan và checklist rỗng, "
        "tra_loi nói rõ là chưa tìm thấy căn cứ.",
        {"tra_loi": {"type": "string", "description": "trả lời ngắn, trả lời thẳng câu hỏi, viết bằng tiếng Việt có dấu "
                                                      "đầy đủ, cho chủ cơ sở kinh doanh"},
         "trich_dan": {"type": "array", "items": _CITATION},
         "checklist": {"type": "array", "items": _TASK}},
        ["tra_loi", "trich_dan", "checklist"]),
]


@dataclass
class Context:
    client: OpenAI
    store: LawStore
    on: str                      # ngay_ap_dung, YYYY-MM-DD
    profile: dict
    use_judge: bool = True
    question: str = ""           # cau_hoi, shown to the judge
    refusals: int = 0
    searches: int = 0
    seen: set = field(default_factory=set)   # provision ids the agent has read
    final: dict | None = None
    last_problems: list = field(default_factory=list)


def _summary(ctx: Context, pid: str) -> dict:
    p = ctx.store.provision(pid) or {}
    s = ctx.store.status(pid, ctx.on)
    out = {"id": pid, "van_ban": p.get("so_hieu"), "dieu": p.get("dieu"), "khoan": p.get("khoan"),
           "trich_doan": (p.get("noi_dung") or "")[:SNIPPET_CHARS], "ap_dung_ngay_hoi": s.in_force,
           "tinh_trang": s.reason}
    if s.replaced_by:
        out["xem_thay"] = list(s.replaced_by)
    if s.amended_by:
        out["doc_kem"] = list(s.amended_by)
        out["cach_trich"] = ("Chỉ trích khoản này khi trích kèm điều khoản sửa đổi "
                             f"{', '.join(s.amended_by)} trong cùng câu trả lời, và đọc hai khoản cùng nhau.")
    return out


def _search(ctx: Context, args: dict) -> dict:
    query = str(args.get("truy_van", ""))
    ctx.searches += 1
    current = [p["id"] for p in ctx.store.search_on(query, ctx.on, limit=SEARCH_LIMIT)]
    stale = []
    for pid in ctx.store.search(query):
        if pid in current:
            continue
        s = ctx.store.status(pid, ctx.on)
        if not s.in_force and s.replaced_by:
            stale.append((not s.amended_by, pid))  # partly amended clauses first: they are citable
    ids = current + [pid for _, pid in sorted(stale, key=lambda x: x[0])[:STALE_HITS]]
    return {"ket_qua": [_summary(ctx, pid) for pid in ids]} if ids else {"ket_qua": [], "goi_y": "thử từ khoá khác"}


def _read(ctx: Context, args: dict) -> dict:
    pid = str(args.get("id", ""))
    p = ctx.store.provision(pid)
    if p is None:
        return {"error": f"không có điều khoản {pid}"}
    ctx.seen.add(pid)
    return {**_summary(ctx, pid), "noi_dung": p["noi_dung"], "trang": p["trang"],
            "ten_van_ban": p["ten_van_ban"], "nguon_url": p["nguon_url"]}


def _chain(ctx: Context, args: dict) -> dict:
    pid = str(args.get("id", ""))
    if ctx.store.provision(pid) is None:
        return {"error": f"không có điều khoản {pid}"}
    return {"bi_tac_dong_boi": ctx.store.relations_to(pid), "tac_dong_toi": ctx.store.relations_from(pid)}


def _no_basis(ctx: Context, args: dict) -> dict | None:
    """The model says the store has no basis: end flagged for an accountant instead of refusing."""
    text = str(args.get("tra_loi", ""))
    if args.get("trich_dan") or not _NO_BASIS.search(normalize(text)):
        return None
    if ctx.searches < MIN_SEARCHES_FOR_NO_BASIS:
        return {"error": "Chưa đủ căn cứ để kết luận kho không có điều khoản phù hợp. Hãy gọi tim_dieu_khoan với "
                         "ít nhất hai cách diễn đạt khác nhau trước."}
    if lacks_diacritics(text):
        return {"error": "Câu trả lời phải viết bằng tiếng Việt có dấu đầy đủ."}
    ctx.final = {"tra_loi": text, "trich_dan": [], "checklist": [], "can_xac_nhan": True}
    return {"status": "no_basis"}


def _submit(ctx: Context, args: dict) -> dict:
    no_basis = _no_basis(ctx, args)
    if no_basis is not None:
        return no_basis
    problems = verify(ctx.client, ctx.store, args, ctx.on, ctx.use_judge, ctx.question)
    if not problems:
        ctx.final = {**args, "can_xac_nhan": False}
        return {"status": "answered"}
    ctx.refusals += 1
    ctx.last_problems = problems
    if ctx.refusals >= MAX_REFUSALS:
        # Show only citations that pass the exact checks; the answer goes out flagged for an accountant.
        # Repeat until stable: dropping an amending clause can make the clause it amends uncitable.
        kept = list(args.get("trich_dan") or [])
        while True:
            ids = {str(c.get("id", "")) for c in kept}
            still = [c for c in kept if not citation_problems(ctx.store, c, ctx.on, cited=ids)]
            if len(still) == len(kept):
                break
            kept = still
        kept_ids = {str(c.get("id", "")) for c in kept}
        if kept:
            ctx.final = {**args, "trich_dan": kept, "can_xac_nhan": True, "van_de_chua_giai_quyet": problems,
                         "checklist": [t for t in args.get("checklist") or [] if t.get("can_cu") in kept_ids]}
        return {"status": "needs_review"}
    return {"error": "Câu trả lời bị từ chối", "van_de": problems,
            "con_lai": MAX_REFUSALS - ctx.refusals}


HANDLERS = {"tim_dieu_khoan": _search, "doc_dieu_khoan": _read, "lan_chuoi_sua_doi": _chain,
            "doc_ho_so": lambda ctx, args: {"ho_so": ctx.profile, "ngay_ap_dung": ctx.on},
            "nop_cau_tra_loi": _submit}


def run(ctx: Context, call: Any) -> dict:
    name = getattr(call, "name", None)
    if name not in HANDLERS:
        return {"error": f"không có tool {name!r}"}
    try:
        args = json.loads(getattr(call, "arguments", None) or "{}")
        return HANDLERS[name](ctx, args if isinstance(args, dict) else {})
    except Exception as error:  # the model reads the error and tries again
        return {"error": f"{type(error).__name__}: {error}"}
