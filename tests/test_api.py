"""lexvi.api with FastAPI's TestClient. The model client is always a fake; no network."""
import io
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from types import SimpleNamespace

import httpx
import openai
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from lexvi import agent, api, ingest
from lexvi.store import LawStore
from tests.fake_model import FakeClient, call

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures"
NEW, NEW_QUOTE = "TEST-MOI-D2-K1", "Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống"
OK = {"ket_qua": [{"so_thu_tu": 1, "ung_ho": True, "ly_do": ""}], "tong_the": {"ung_ho": True, "ly_do": ""}}
LONG_TEXT = ["Điều 1. " + "Nội dung văn bản mới dài. " * 20]
ORIGIN = {"Origin": "http://localhost:3123"}


@pytest.fixture
def fake():
    return FakeClient([])


@pytest.fixture
def client(monkeypatch, tmp_path, fake):
    store = LawStore(FIXTURES)
    monkeypatch.setattr(agent, "RUNS_DIR", tmp_path / "runs")
    monkeypatch.setattr(api, "RUNS_DIR", tmp_path / "runs")
    monkeypatch.setattr(api, "_store", lambda: store)
    monkeypatch.setattr(api, "_client", lambda: fake)
    return TestClient(api.app, raise_server_exceptions=False)


def body(**kw):
    b = {"cau_hoi": "Ngưỡng miễn thuế GTGT năm 2026?", "ngay_ap_dung": "2026-03-01",
         "ho_so": {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 400000000, "dia_ban": "TP.HCM"}}
    b.update(kw)
    return b


def pdf_blank(pages=1):
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=595, height=842)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def post_pdf(client, data=b"%PDF-1.4 x", **kw):
    return client.post("/ingest", files={"pdf": ("a.pdf", data, "application/pdf")}, data={"ho_so": "{}"}, **kw)


def test_health_reports_the_count(client):
    assert client.get("/health").json() == {"ok": True, "so_dieu_khoan": 3}


def test_ask_happy_path_and_run_record(client, fake):
    fake.turns[:] = [call("nop_cau_tra_loi", tra_loi="Không phải nộp.",
                          trich_dan=[{"id": NEW, "cau_trich": NEW_QUOTE, "nhan_dinh": "ngưỡng"}], checklist=[]), OK]
    r = client.post("/ask", json=body())
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["trang_thai"] == "answered" and j["trich_dan"][0]["id"] == NEW
    assert client.get(f"/runs/{j['run_id']}").json()["output"]["run_id"] == j["run_id"]


def test_ask_rejects_a_whitespace_only_question(client, fake):
    r = client.post("/ask", json=body(cau_hoi="   "))
    assert r.status_code == 422 and fake.requests == []


def test_ask_without_a_key_is_503(client, monkeypatch):
    def no_key():
        raise RuntimeError("MODEL_API_KEY is not set")
    monkeypatch.setattr(api, "_client", no_key)
    assert client.post("/ask", json=body()).status_code == 503


def test_unexpected_error_is_a_500_with_cors_headers(client, monkeypatch):
    def boom(*args, **kwargs):
        raise KeyError("x")
    monkeypatch.setattr(agent, "ask", boom)
    r = client.post("/ask", json=body(), headers=ORIGIN)
    assert r.status_code == 500 and r.headers.get("access-control-allow-origin")


@pytest.mark.parametrize("data", [b"%PDF-1.4\nthis is not a pdf", b"%PDF", b"%PDF-1.7\n%%EOF"])
def test_ingest_corrupt_pdf_is_a_client_error(client, fake, data):
    r = post_pdf(client, data, headers=ORIGIN)
    assert 400 <= r.status_code < 500 and fake.requests == []
    assert r.headers.get("access-control-allow-origin")


def test_ingest_scanned_pdf_is_422(client, fake):
    assert post_pdf(client, pdf_blank(2)).status_code == 422 and fake.requests == []


def test_ingest_model_connection_error_is_503(client, fake, monkeypatch):
    monkeypatch.setattr(ingest, "pdf_text", lambda data: LONG_TEXT)
    fake.turns[:] = [openai.APIConnectionError(request=httpx.Request("POST", "http://127.0.0.1:9/v1/responses"))]
    assert post_pdf(client).status_code == 503


def test_ingest_truncated_model_json_is_502(client, monkeypatch):
    monkeypatch.setattr(ingest, "pdf_text", lambda data: LONG_TEXT)

    class Truncated:
        def __init__(self):
            self.responses = self

        def create(self, **kw):
            return SimpleNamespace(output=[], output_text='{"van_ban_moi": {"so_hieu": "141/2026/NĐ-CP", "tieu')

    monkeypatch.setattr(api, "_client", lambda: Truncated())
    assert post_pdf(client).status_code == 502


def test_ingest_does_not_block_other_requests(client, monkeypatch):
    payload = {"van_ban_moi": {"so_hieu": "X", "tieu_de": "t", "hieu_luc_tu": "2026-01-01"}, "thay_doi": []}

    class Slow:
        def __init__(self):
            self.responses = self

        def create(self, **kwargs):
            time.sleep(2.0)
            return SimpleNamespace(output=[], output_text=json.dumps(payload))

    monkeypatch.setattr(api, "_client", lambda: Slow())
    monkeypatch.setattr(ingest, "pdf_text", lambda data: LONG_TEXT)
    with client:
        t = threading.Thread(target=lambda: post_pdf(client))
        t.start()
        time.sleep(0.4)
        started = time.time()
        r = client.get("/health")
        waited = time.time() - started
        t.join()
    assert r.status_code == 200 and waited < 1.0, f"/health waited {waited:.1f} s behind /ingest"


def test_cors_origin_list_tolerates_spaces(tmp_path):
    code = ("from fastapi.testclient import TestClient; from lexvi import api;"
            "r=TestClient(api.app).options('/health', headers={'Origin':'http://b.test',"
            "'Access-Control-Request-Method':'GET'}); print(r.headers.get('access-control-allow-origin'))")
    env = dict(os.environ, LEXVI_CORS_ORIGINS="http://a.test, http://b.test", PYTHONPATH=str(ROOT),
               PYTHONDONTWRITEBYTECODE="1")
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, env=env, cwd=tmp_path,
                         timeout=120)
    assert out.returncode == 0, out.stderr[-500:]
    assert out.stdout.strip() == "http://b.test"
