"""The public-deploy guards in lexvi.api: limits, the origin check and the usage report. No network."""
import pytest
from fastapi.testclient import TestClient

from lexvi import agent, api
from lexvi.limits import Limits
from lexvi.store import LawStore
from tests.fake_model import FakeClient, call
from tests.test_api import FIXTURES, NEW, NEW_QUOTE, OK, body, post_pdf

LIVE = {"Origin": "https://live.test"}


def answer_turns():
    return [call("nop_cau_tra_loi", tra_loi="Không phải nộp.",
                 trich_dan=[{"id": NEW, "cau_trich": NEW_QUOTE, "nhan_dinh": "ngưỡng"}], checklist=[]), OK]


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


def test_limits_and_origin_check_are_off_by_default():
    assert not api.LIMITS.active and not api.REQUIRE_ORIGIN


def test_ask_reports_its_usage(client, fake):
    fake.turns[:] = answer_turns()
    j = client.post("/ask", json=body()).json()
    # The fake model reports no usage, so both calls count at the fallback price.
    assert j["su_dung"]["so_lan_goi"] == 2
    assert j["su_dung"]["chi_phi_uoc_tinh_usd"] == pytest.approx(2 * api.PRICES.unmetered_call)


def test_a_visitor_over_the_limit_gets_429_with_cors_and_retry_after(client, fake, monkeypatch):
    monkeypatch.setattr(api, "LIMITS", Limits(per_visitor={"ask": [(1, 3600)]}))
    fake.turns[:] = answer_turns()
    assert client.post("/ask", json=body(), headers=LIVE).status_code == 200
    r = client.post("/ask", json=body(), headers=LIVE)
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 3500
    assert r.headers.get("access-control-allow-origin") and "retry-after" in r.headers.get(
        "access-control-expose-headers", "").lower()
    assert fake.requests and len(fake.requests) == 2  # the refused ask never reached the model


def test_the_budget_turns_requests_away_once_spent(client, fake, monkeypatch):
    monkeypatch.setattr(api, "LIMITS", Limits(budget_usd_day=0.01))
    fake.turns[:] = answer_turns()
    assert client.post("/ask", json=body()).status_code == 200  # spends 2 x the fallback price
    r = client.post("/ask", json=body())
    assert r.status_code == 429 and "hạn mức" in r.json()["detail"]


def test_an_unreadable_pdf_does_not_use_up_the_visitor_limit(client, fake, monkeypatch):
    monkeypatch.setattr(api, "LIMITS", Limits(per_visitor={"ingest": [(1, 3600)]}))
    for _ in range(3):
        assert post_pdf(client, b"%PDF-1.4\nthis is not a pdf").status_code == 400
    assert fake.requests == []


@pytest.mark.parametrize("headers, status", [({"Origin": "https://evil.test"}, 403), ({}, 403), (LIVE, 200)])
def test_required_origin(client, fake, monkeypatch, headers, status):
    monkeypatch.setattr(api, "REQUIRE_ORIGIN", True)
    monkeypatch.setattr(api, "ALLOWED_ORIGINS", ["https://live.test"])
    fake.turns[:] = answer_turns()
    assert client.post("/ask", json=body(), headers=headers).status_code == status
    assert post_pdf(client, headers=headers).status_code == (403 if status == 403 else 400)


def test_health_is_never_limited(client, monkeypatch):
    monkeypatch.setattr(api, "LIMITS", Limits(budget_usd_day=0.0, max_busy=1))
    monkeypatch.setattr(api, "REQUIRE_ORIGIN", True)
    assert all(client.get("/health").status_code == 200 for _ in range(5))
