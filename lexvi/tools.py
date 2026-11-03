"""The agent's tools: DEFINITIONS (what Spark sees) and run() (what the code does).

Every lookup is answered from the law store with the validity on the asked date already
computed, so the model never has to guess whether a provision still applies.
nop_cau_tra_loi is the only way to finish; it runs verify.py and refuses with reasons.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from openai import OpenAI

from .store import LawStore
from .verify import citation_problems, verify

MAX_REFUSALS = 3
SNIPPET_CHARS = 280


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
    _fn("tim_dieu_khoan", "Tìm điều khoản luật thuế theo từ khoá. Mỗi kết quả ghi rõ còn áp dụng vào ngày hỏi hay không, "
        "và nếu không thì điều nào thay thế.", {"truy_van": {"type": "string"}}, ["truy_van"]),
    _fn("doc_dieu_khoan", "Đọc toàn văn một điều khoản theo id, kèm văn bản chứa nó và tình trạng hiệu lực vào ngày hỏi.",
        {"id": {"type": "string"}}, ["id"]),
    _fn("lan_chuoi_sua_doi", "Lần các quan hệ của một điều khoản: điều nào sửa đổi, thay thế, bãi bỏ, hướng dẫn nó, "
        "và nó sửa đổi điều nào.", {"id": {"type": "string"}}, ["id"]),
    _fn("doc_ho_so", "Đọc hồ sơ cơ sở kinh doanh của người hỏi (loại hình, ngành, doanh thu năm, địa bàn).", {}, []),
    _fn("nop_cau_tra_loi", "Nộp câu trả lời cuối. Bị từ chối nếu trích dẫn không tồn tại, không còn áp dụng vào ngày hỏi, "
        "câu trích không nguyên văn, hoặc điều khoản không ủng hộ nhận định. Kết quả từ chối nêu lý do để sửa.",
        {"tra_loi": {"type": "string", "description": "trả lời ngắn, tiếng Việt, cho chủ cơ sở kinh doanh"},
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
    refusals: int = 0
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
    return out


def _search(ctx: Context, args: dict) -> dict:
    ids = ctx.store.search(str(args.get("truy_van", "")))
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


def _submit(ctx: Context, args: dict) -> dict:
    problems = verify(ctx.client, ctx.store, args, ctx.on, ctx.use_judge)
    if not problems:
        ctx.final = {**args, "can_xac_nhan": False}
        return {"status": "answered"}
    ctx.refusals += 1
    ctx.last_problems = problems
    if ctx.refusals >= MAX_REFUSALS:
        # Show only citations that pass the exact checks; the answer goes out flagged for an accountant.
        kept = [c for c in args.get("trich_dan") or [] if not citation_problems(ctx.store, c, ctx.on)]
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
