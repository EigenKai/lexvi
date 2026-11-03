"""The LexVi agent loop on Muse Spark (Responses API, one tool call per turn).

Each turn Spark picks a tool, the code runs it and sends the result back. The run ends
when nop_cau_tra_loi passes verification ("answered"), after MAX_REFUSALS refusals
("needs_review": the answer goes out flagged can_xac_nhan), or at the turn limit.
Every run is saved to runs/<id>.json so the UI can replay the steps.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path

import openai
from openai import OpenAI

from . import tools
from .config import RUNS_DIR, model
from .store import LawStore

MAX_TURNS = 14
INSTRUCTIONS = (Path(__file__).parent / "system_instructions.md").read_text(encoding="utf-8")


def _user(text: str) -> dict:
    return {"role": "user", "content": text}


def _question(cau_hoi: str, on: str, profile: dict) -> str:
    return (f"Câu hỏi của chủ cơ sở kinh doanh: {cau_hoi}\n"
            f"Ngày áp dụng: {on}\nHồ sơ: {json.dumps(profile, ensure_ascii=False)}")


def _render(store: LawStore, final: dict, on: str) -> dict:
    """The contract output: citations enriched with page, document, source and status."""
    citations = []
    for c in final.get("trich_dan") or []:
        p = store.provision(str(c.get("id", ""))) or {}
        citations.append({**c, "trang": p.get("trang"), "so_hieu": p.get("so_hieu"),
                          "ten_van_ban": p.get("ten_van_ban"), "nguon_url": p.get("nguon_url"),
                          "tinh_trang": store.status(c.get("id", ""), on).reason,
                          "chuoi_sua_doi": store.relations_to(c.get("id", ""))})
    out = {"tra_loi": final.get("tra_loi", ""), "trich_dan": citations,
           "checklist": final.get("checklist") or [], "can_xac_nhan": bool(final.get("can_xac_nhan"))}
    if final.get("van_de_chua_giai_quyet"):
        out["van_de_chua_giai_quyet"] = final["van_de_chua_giai_quyet"]
    return out


def _fallback(reason: str, problems: list) -> dict:
    return {"tra_loi": "LexVi chưa tìm được câu trả lời có căn cứ đã kiểm chứng. "
                       "Vui lòng hỏi kế toán hoặc cơ quan thuế.",
            "trich_dan": [], "checklist": [], "can_xac_nhan": True,
            "van_de_chua_giai_quyet": problems or [reason]}


def ask(client: OpenAI, store: LawStore, cau_hoi: str, on: str, profile: dict,
        use_judge: bool = True, max_turns: int = MAX_TURNS) -> dict:
    ctx = tools.Context(client=client, store=store, on=on, profile=profile, use_judge=use_judge)
    messages: list = [_user(_question(cau_hoi, on, profile))]
    steps, status, started = [], "running", time.time()
    for turn in range(1, max_turns + 1):
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
        steps.append({"turn": turn, "tool": calls[0].name, "args": json.loads(calls[0].arguments or "{}"),
                      "result": result})
        messages.append({"type": "function_call_output", "call_id": calls[0].call_id,
                         "output": json.dumps(result, ensure_ascii=False)})
        status = result.get("status", "running")
        if status != "running":
            break
    output = (_render(store, ctx.final, on) if ctx.final
              else _fallback(f"dừng ở trạng thái {status}", ctx.last_problems))
    run_id = uuid.uuid4().hex[:12]
    output.update(run_id=run_id, trang_thai=status, so_luot=len(steps),
                  thoi_gian_giay=round(time.time() - started, 1))
    _save(run_id, {"cau_hoi": cau_hoi, "ngay_ap_dung": on, "ho_so": profile, "steps": steps, "output": output})
    return output


def _save(run_id: str, record: dict) -> None:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    (RUNS_DIR / f"{run_id}.json").write_text(json.dumps(record, ensure_ascii=False, indent=1, default=str),
                                             encoding="utf-8")
