"""The LexVi agent loop on Muse Spark (Responses API, one tool call per turn).

Each turn Spark picks a tool, the code runs it and sends the result back. The run ends
when nop_cau_tra_loi passes verification ("answered"), after MAX_REFUSALS refusals
("needs_review": the answer goes out flagged can_xac_nhan), when the model reports that
the store has no basis ("no_basis", flagged), at the turn limit ("turn_limit"), on a
model API error ("api_error"), or when the client goes away ("cancelled").
Every run is saved to runs/<id>.json so the UI can replay the steps.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path

import openai
from openai import OpenAI

from . import tools
from .config import RUNS_DIR, model
from .store import OVERRIDING, LawStore
from .verify import citable

MAX_TURNS = 20
NUDGE_TURNS_LEFT = 3   # at turn MAX_TURNS - 3, tell the model to wrap up
INSTRUCTIONS = (Path(__file__).parent / "system_instructions.md").read_text(encoding="utf-8")
ONE_TOOL_PER_TURN = {"error": "Mỗi lượt chỉ chạy một tool; lệnh gọi này không được chạy. Gọi lại ở lượt sau nếu cần."}

_REASONS = {
    "turn_limit": "LexVi đã dùng hết số lượt tra cứu cho phép mà chưa có câu trả lời qua kiểm chứng.",
    "needs_review": "Câu trả lời bị từ chối ở bước kiểm chứng và không còn trích dẫn nào đạt.",
    "api_error": "Không kết nối được mô hình Muse Spark.",
    "cancelled": "Yêu cầu đã bị huỷ trước khi có câu trả lời.",
    "loi": "Lỗi hệ thống khi xử lý câu hỏi.",
}


def _user(text: str) -> dict:
    return {"role": "user", "content": text}


def _question(cau_hoi: str, on: str, profile: dict, max_turns: int = MAX_TURNS) -> str:
    return (f"Câu hỏi của chủ cơ sở kinh doanh: {cau_hoi}\n"
            f"Ngày áp dụng: {on}\nHồ sơ: {json.dumps(profile, ensure_ascii=False)}\n"
            f"Giới hạn: tối đa {max_turns} lượt, mỗi lượt gọi đúng một tool. Nộp câu trả lời trước khi hết lượt.")


def _edge(store: LawStore, e: dict) -> dict:
    """A relation with its issue date and a retroactivity flag (issued after it takes effect)."""
    issued = e.get("ngay_ban_hanh")
    if not issued:
        source = store.provision(e["tu_id"])
        issued = (store.document(source["so_hieu"] if source else e["tu_id"]) or {}).get("ngay_ban_hanh")
    start = e.get("hieu_luc_tu")
    return {**e, "ngay_ban_hanh": issued, "hoi_to": bool(issued and start and issued > start)}


def _render(store: LawStore, final: dict, on: str) -> dict:
    """The contract output: citations enriched with page, document, dates, status and relations."""
    citations = []
    cited = {str(c.get("id", "")) for c in final.get("trich_dan") or []}
    for c in final.get("trich_dan") or []:
        pid = str(c.get("id", ""))
        p = store.provision(pid) or {}
        doc = store.document(p.get("so_hieu") or "") or {}
        status = store.status(pid, on)
        applies = citable(store, pid, on, cited)
        if not status.in_force and applies:
            # The web parses "đang có hiệu lực": keep it only because the clause is citable this way.
            tinh_trang = f"đang có hiệu lực (đã được sửa đổi bởi {', '.join(status.amended_by)} — đọc kèm)"
        else:
            tinh_trang = status.reason
        locations = store.quote_locations(pid, c.get("cau_trich", ""))
        incoming, outgoing = store.relations_to(pid), store.relations_from(pid)
        issued, start = doc.get("ngay_ban_hanh"), p.get("hieu_luc_tu")
        citations.append({**c, "trang": locations[0]["trang"] if locations else p.get("trang"),
                          "vi_tri_nguon": locations, "so_hieu": p.get("so_hieu"),
                          "ten_van_ban": p.get("ten_van_ban"), "nguon_url": p.get("nguon_url"),
                          "tinh_trang": tinh_trang, "ap_dung_ngay_hoi": applies,
                          "ngay_ban_hanh": issued, "hieu_luc_tu": start, "het_hieu_luc": p.get("het_hieu_luc"),
                          "hoi_to": bool(issued and start and issued > start),
                          "sua_doi_toi": [_edge(store, e) for e in outgoing if e["loai"] in OVERRIDING],
                          "bi_sua_doi_boi": [_edge(store, e) for e in incoming if e["loai"] in OVERRIDING],
                          "dan_chieu": [_edge(store, e) for e in incoming + outgoing if e["loai"] == "dan_chieu"],
                          "chuoi_sua_doi": incoming})
    out = {"tra_loi": final.get("tra_loi", ""), "trich_dan": citations,
           "checklist": final.get("checklist") or [], "can_xac_nhan": bool(final.get("can_xac_nhan"))}
    if final.get("van_de_chua_giai_quyet"):
        out["van_de_chua_giai_quyet"] = final["van_de_chua_giai_quyet"]
    return out


def _fallback(status: str, problems: list) -> dict:
    reason = _REASONS.get(status, f"LexVi dừng ở trạng thái {status}.")
    if status == "api_error":
        text = ("LexVi tạm thời không kết nối được mô hình nên chưa trả lời được. Vui lòng thử lại sau ít phút; "
                "nếu cần gấp, hãy hỏi kế toán hoặc cơ quan thuế.")
    elif status == "cancelled":
        text = "Yêu cầu đã bị huỷ trước khi LexVi trả lời xong."
    else:
        text = "LexVi chưa tìm được câu trả lời có căn cứ đã kiểm chứng. Vui lòng hỏi kế toán hoặc cơ quan thuế."
    unresolved = [reason, *problems] if status in ("api_error", "cancelled", "loi") else (problems or [reason])
    return {"tra_loi": text, "trich_dan": [], "checklist": [], "can_xac_nhan": True,
            "van_de_chua_giai_quyet": unresolved}


def _args(call) -> dict:
    try:
        args = json.loads(getattr(call, "arguments", None) or "{}")
    except (json.JSONDecodeError, TypeError):
        return {"_raw": str(getattr(call, "arguments", ""))}
    return args if isinstance(args, dict) else {"_raw": args}


def ask(client: OpenAI, store: LawStore, cau_hoi: str, on: str, profile: dict,
        use_judge: bool = True, max_turns: int = MAX_TURNS, cancel: threading.Event | None = None) -> dict:
    ctx = tools.Context(client=client, store=store, on=on, profile=profile, use_judge=use_judge, question=cau_hoi)
    messages: list = [_user(_question(cau_hoi, on, profile, max_turns))]
    steps, status, started, output = [], "running", time.time(), None
    try:
        for turn in range(1, max_turns + 1):
            if cancel is not None and cancel.is_set():
                status = "cancelled"
                break
            if turn == max_turns - NUDGE_TURNS_LEFT:
                messages.append(_user(f"Chỉ còn {NUDGE_TURNS_LEFT + 1} lượt. Không tìm thêm; đọc điều khoản cần trích "
                                      "nếu chưa đọc, rồi gọi nop_cau_tra_loi."))
            if turn == max_turns:
                messages.append(_user("Đây là lượt cuối. Gọi nop_cau_tra_loi ngay với những gì đã có."))
            try:
                response = client.responses.create(
                    model=model(), instructions=INSTRUCTIONS, input=messages,
                    tools=tools.DEFINITIONS, parallel_tool_calls=False, store=False,
                    max_output_tokens=6000,
                )
            except openai.APIError as error:
                status = "api_error"
                steps.append({"turn": turn, "error": str(error)})
                break
            messages += response.output
            calls = [item for item in response.output if item.type == "function_call"]
            if not calls:
                messages.append(_user("Không nhận văn bản thường. Hãy gọi đúng một tool."))
                continue
            result = tools.run(ctx, calls[0])
            steps.append({"turn": turn, "tool": calls[0].name, "args": _args(calls[0]), "result": result})
            messages.append({"type": "function_call_output", "call_id": calls[0].call_id,
                             "output": json.dumps(result, ensure_ascii=False)})
            # Every function call needs an output in the next request, or the API rejects it.
            for extra in calls[1:]:
                messages.append({"type": "function_call_output", "call_id": extra.call_id,
                                 "output": json.dumps(ONE_TOOL_PER_TURN, ensure_ascii=False)})
            status = result.get("status", "running")
            if status != "running":
                break
        if status == "running":
            status = "turn_limit"
        output = _render(store, ctx.final, on) if ctx.final else _fallback(status, ctx.last_problems)
    except Exception as error:
        status = "loi"
        steps.append({"error": f"{type(error).__name__}: {error}"})
        raise
    finally:
        if output is None:
            output = _fallback(status, ctx.last_problems)
        run_id = uuid.uuid4().hex[:12]
        output.update(run_id=run_id, trang_thai=status, so_luot=len(steps),
                      thoi_gian_giay=round(time.time() - started, 1))
        _save(run_id, {"cau_hoi": cau_hoi, "ngay_ap_dung": on, "ho_so": profile, "steps": steps, "output": output})
    return output


def _save(run_id: str, record: dict) -> None:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    (RUNS_DIR / f"{run_id}.json").write_text(json.dumps(record, ensure_ascii=False, indent=1, default=str),
                                             encoding="utf-8")
