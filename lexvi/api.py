"""HTTP API for the web app.

    uvicorn lexvi.api:app --reload --port 8000
    POST /ask     {cau_hoi, ngay_ap_dung, ho_so}  -> answer with verified citations
    POST /ingest  multipart: pdf (file), ho_so (JSON string) -> changes + to-do items
    GET  /runs/{run_id}  the saved steps of one /ask run (for the "how LexVi checked" view)

Errors are raised as HTTPException so they pass through the CORS middleware: an unhandled
exception would come back as a bare 500 without CORS headers, which the browser hides.

For a public deployment, lexvi/limits.py adds an optional spend budget, per-visitor limits and a
cap on requests in flight (all off unless their env vars are set), and LEXVI_REQUIRE_ORIGIN=1
refuses POSTs from origins outside LEXVI_CORS_ORIGINS. /ask and /ingest report their metered
token use and estimated cost in `su_dung`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import threading
from contextlib import asynccontextmanager
from datetime import date
from functools import lru_cache

import openai
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from . import agent, ingest
from .config import DATA_DIR, RUNS_DIR, make_client
from .limits import Limits, Metered, Prices, Refused, Ticket, visitor_key
from .store import LawStore

MAX_PDF_BYTES = 20 * 1024 * 1024
DISCONNECT_POLL_SECONDS = 1.0
_RUN_ID = re.compile(r"^[0-9a-f]{12}$")
log = logging.getLogger("lexvi.api")
if not logging.getLogger().handlers:  # under uvicorn the root logger has no handler: show our INFO lines
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s %(message)s")

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("LEXVI_CORS_ORIGINS", "*").split(",") if o.strip()]
REQUIRE_ORIGIN = os.environ.get("LEXVI_REQUIRE_ORIGIN", "").strip().lower() in ("1", "true", "yes")
LIMITS = Limits.from_env()
PRICES = Prices.from_env()
REFUSED = {
    "busy": "Máy chủ đang bận, vui lòng thử lại sau ít phút",
    "budget": "Bản demo trực tiếp đã dùng hết hạn mức trong 24 giờ, vui lòng thử lại sau",
    "visitor": "Bạn đã gửi nhiều yêu cầu liên tiếp, vui lòng thử lại sau",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Build the store before taking traffic: the first health check is then instant, and two
    # concurrent first requests cannot build it twice.
    try:
        await run_in_threadpool(_store)
    except (FileNotFoundError, ValueError):
        log.exception("could not load the data store; /health reports it")
    if LIMITS.active or REQUIRE_ORIGIN:
        log.info("public mode: %s; require origin: %s", LIMITS.describe(), REQUIRE_ORIGIN)
    yield


app = FastAPI(title="LexVi", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
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


def _check_origin(request: Request) -> None:
    """CORS only stops browsers; with LEXVI_REQUIRE_ORIGIN=1 a POST must also name an allowed origin."""
    if REQUIRE_ORIGIN and "*" not in ALLOWED_ORIGINS and request.headers.get("origin") not in ALLOWED_ORIGINS:
        raise HTTPException(403, "Nguồn gọi không được phép")


def _admit(kind: str, request: Request) -> Ticket:
    peer = request.client.host if request.client else None
    try:
        return LIMITS.admit(kind, visitor_key(request.headers, peer))
    except Refused as refused:
        log.warning("%s refused (%s); retry after %s s", kind, refused.reason, refused.retry_after)
        raise HTTPException(429, REFUSED[refused.reason],
                            headers={"Retry-After": str(refused.retry_after)}) from None


def _settle(kind: str, ticket: Ticket, meter: Metered, run_id: str | None = None) -> None:
    """Give the slot back and record the spend. A request that never reached the model is not
    counted against the visitor (an unreadable PDF, a scanned one)."""
    LIMITS.release(ticket, meter.cost_usd(), refund=meter.calls == 0)
    if meter.calls:
        log.info("%s %s: %s", kind, run_id or "-", meter.summary())


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
    _check_origin(request)
    client, store = _model_client(), _store()
    ticket = _admit("ask", request)
    meter = Metered(client, PRICES)
    cancel = threading.Event()  # set when the client goes away; the agent stops before its next turn
    result: dict | None = None
    try:
        work = asyncio.ensure_future(run_in_threadpool(
            agent.ask, meter, store, req.cau_hoi, req.ngay_ap_dung.isoformat(), req.ho_so.model_dump(),
            cancel=cancel))
        while not work.done():
            await asyncio.wait({work}, timeout=DISCONNECT_POLL_SECONDS)
            if not work.done() and not cancel.is_set() and await request.is_disconnected():
                cancel.set()
        result = work.result()
    except Exception as error:
        log.exception("ask failed")
        raise HTTPException(500, "Lỗi máy chủ khi xử lý câu hỏi") from error
    finally:
        _settle("ask", ticket, meter, result.get("run_id") if isinstance(result, dict) else None)
    result["su_dung"] = meter.summary()
    return result


@app.post("/ingest")
async def ingest_pdf(request: Request, pdf: UploadFile = File(...), ho_so: str = Form("{}")) -> dict:
    _check_origin(request)
    data = await pdf.read()
    if not data.startswith(b"%PDF") or len(data) > MAX_PDF_BYTES:
        raise HTTPException(400, "Cần một file PDF dưới 20 MB")
    try:
        profile = Profile(**json.loads(ho_so)).model_dump()
    except (ValueError, TypeError) as error:
        raise HTTPException(400, f"ho_so không hợp lệ: {error}") from error
    client = _model_client()
    ticket = _admit("ingest", request)
    meter = Metered(client, PRICES)
    try:
        # analyze blocks (pypdf + a long model call): keep it off the event loop.
        result = await run_in_threadpool(ingest.analyze, meter, _store(), data, profile)
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
    finally:
        _settle("ingest", ticket, meter)
    result["su_dung"] = meter.summary()
    return result


@app.get("/runs/{run_id}")
def run(run_id: str) -> dict:
    path = RUNS_DIR / f"{run_id}.json"
    if not _RUN_ID.match(run_id) or not path.exists():
        raise HTTPException(404, "Không có lượt chạy này")
    return json.loads(path.read_text(encoding="utf-8"))
