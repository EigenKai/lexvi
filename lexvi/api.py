"""HTTP API for the web app.

    uvicorn lexvi.api:app --reload --port 8000
    POST /ask     {cau_hoi, ngay_ap_dung, ho_so}  -> answer with verified citations
    POST /ingest  multipart: pdf (file), ho_so (JSON string) -> changes + to-do items
    GET  /runs/{run_id}  the saved steps of one /ask run (for the "how LexVi checked" view)
"""

from __future__ import annotations

import json
import os
import re
from datetime import date
from functools import lru_cache

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import agent, ingest
from .config import DATA_DIR, RUNS_DIR, make_client
from .store import LawStore

MAX_PDF_BYTES = 20 * 1024 * 1024
_RUN_ID = re.compile(r"^[0-9a-f]{12}$")

app = FastAPI(title="LexVi")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("LEXVI_CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def _store() -> LawStore:
    return LawStore(DATA_DIR)


@lru_cache(maxsize=1)
def _client():
    return make_client()


class Profile(BaseModel):
    loai_hinh: str = Field("ho_kinh_doanh", pattern="^(ho_kinh_doanh|doanh_nghiep_nho)$")
    nganh: str = Field("", max_length=200)
    doanh_thu_nam: int = Field(0, ge=0)
    dia_ban: str = Field("", max_length=200)


class AskRequest(BaseModel):
    cau_hoi: str = Field(min_length=3, max_length=2000)
    ngay_ap_dung: date = Field(default_factory=date.today)
    ho_so: Profile = Field(default_factory=Profile)


@app.get("/health")
def health() -> dict:
    count = _store().db.execute("SELECT count(*) FROM dieu_khoan").fetchone()[0]
    return {"ok": True, "so_dieu_khoan": count}


@app.post("/ask")
def ask(req: AskRequest) -> dict:
    return agent.ask(_client(), _store(), req.cau_hoi, req.ngay_ap_dung.isoformat(), req.ho_so.model_dump())


@app.post("/ingest")
async def ingest_pdf(pdf: UploadFile = File(...), ho_so: str = Form("{}")) -> dict:
    data = await pdf.read()
    if not data.startswith(b"%PDF") or len(data) > MAX_PDF_BYTES:
        raise HTTPException(400, "Cần một file PDF dưới 20 MB")
    try:
        profile = Profile(**json.loads(ho_so)).model_dump()
    except (ValueError, TypeError) as error:
        raise HTTPException(400, f"ho_so không hợp lệ: {error}") from error
    try:
        return ingest.analyze(_client(), _store(), data, profile)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@app.get("/runs/{run_id}")
def run(run_id: str) -> dict:
    path = RUNS_DIR / f"{run_id}.json"
    if not _RUN_ID.match(run_id) or not path.exists():
        raise HTTPException(404, "Không có lượt chạy này")
    return json.loads(path.read_text(encoding="utf-8"))
