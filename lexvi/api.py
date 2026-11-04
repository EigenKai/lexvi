"""HTTP API for the web app.

    uvicorn lexvi.api:app --reload --port 8000
    POST /ask     {cau_hoi, ngay_ap_dung, ho_so}  -> answer with verified citations
    POST /ingest  multipart: pdf (file), ho_so (JSON string) -> changes + to-do items
    GET  /runs/{run_id}  the saved steps of one /ask run (for the "how LexVi checked" view)

Errors are raised as HTTPException so they pass through the CORS middleware: an unhandled
exception would come back as a bare 500 without CORS headers, which the browser hides.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import threading
from datetime import date
from functools import lru_cache

import openai
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from . import agent, ingest
from .config import DATA_DIR, RUNS_DIR, make_client
from .store import LawStore

MAX_PDF_BYTES = 20 * 1024 * 1024
DISCONNECT_POLL_SECONDS = 1.0
_RUN_ID = re.compile(r"^[0-9a-f]{12}$")
log = logging.getLogger("lexvi.api")

app = FastAPI(title="LexVi")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("LEXVI_CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def _store() -> LawStore:
    return LawStore(DATA_DIR)


@lru_cache(maxsize=1)
def _client():
    return make_client()


def _model_client():
    try:
        return _client()
    except RuntimeError as error:  # no MODEL_API_KEY
        raise HTTPException(503, "Máy chủ chưa cấu hình khoá Meta Model API") from error


class Profile(BaseModel):
    loai_hinh: str = Field("ho_kinh_doanh", pattern="^(ho_kinh_doanh|doanh_nghiep_nho)$")
    nganh: str = Field("", max_length=200)
    doanh_thu_nam: int = Field(0, ge=0)
    dia_ban: str = Field("", max_length=200)


class AskRequest(BaseModel):
    cau_hoi: str = Field(min_length=3, max_length=2000, pattern=r"\S")
    ngay_ap_dung: date = Field(default_factory=date.today)
    ho_so: Profile = Field(default_factory=Profile)


@app.get("/health")
def health() -> dict:
    try:
        count = _store().count()
    except (FileNotFoundError, ValueError):
        return {"ok": False, "so_dieu_khoan": 0, "loi": "không tải được kho dữ liệu"}
    return {"ok": count > 0, "so_dieu_khoan": count}


@app.post("/ask")
async def ask(req: AskRequest, request: Request) -> dict:
    client, store = _model_client(), _store()
    cancel = threading.Event()  # set when the client goes away; the agent stops before its next turn
    work = asyncio.ensure_future(run_in_threadpool(
        agent.ask, client, store, req.cau_hoi, req.ngay_ap_dung.isoformat(), req.ho_so.model_dump(),
        cancel=cancel))
    try:
        while not work.done():
            await asyncio.wait({work}, timeout=DISCONNECT_POLL_SECONDS)
            if not work.done() and not cancel.is_set() and await request.is_disconnected():
                cancel.set()
        return work.result()
    except Exception as error:
        log.exception("ask failed")
        raise HTTPException(500, "Lỗi máy chủ khi xử lý câu hỏi") from error


@app.post("/ingest")
async def ingest_pdf(pdf: UploadFile = File(...), ho_so: str = Form("{}")) -> dict:
    data = await pdf.read()
    if not data.startswith(b"%PDF") or len(data) > MAX_PDF_BYTES:
        raise HTTPException(400, "Cần một file PDF dưới 20 MB")
    try:
        profile = Profile(**json.loads(ho_so)).model_dump()
    except (ValueError, TypeError) as error:
        raise HTTPException(400, f"ho_so không hợp lệ: {error}") from error
    client = _model_client()
    try:
        # analyze blocks (pypdf + a long model call): keep it off the event loop.
        return await run_in_threadpool(ingest.analyze, client, _store(), data, profile)
    except ingest.BadPdf as error:
        raise HTTPException(400, str(error)) from error
    except json.JSONDecodeError as error:  # a ValueError: must come before it
        raise HTTPException(502, "Mô hình trả kết quả không đầy đủ, vui lòng thử lại") from error
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    except openai.APIConnectionError as error:  # includes timeouts
        raise HTTPException(503, "Không kết nối được Meta Model API, vui lòng thử lại") from error
    except openai.APIError as error:
        raise HTTPException(502, "Meta Model API báo lỗi, vui lòng thử lại") from error
    except Exception as error:
        log.exception("ingest failed")
        raise HTTPException(500, "Lỗi máy chủ khi phân tích văn bản") from error


@app.get("/runs/{run_id}")
def run(run_id: str) -> dict:
    path = RUNS_DIR / f"{run_id}.json"
    if not _RUN_ID.match(run_id) or not path.exists():
        raise HTTPException(404, "Không có lượt chạy này")
    return json.loads(path.read_text(encoding="utf-8"))
