import json
from pathlib import Path

import pytest

from lexvi import agent, config, ingest
from lexvi.store import LawStore
from tests.fake_model import FakeClient, call

FIXTURES = Path(__file__).parent / "fixtures"
OLD, NEW = "TEST-CU-D4-K1", "TEST-MOI-D2-K1"
OLD_QUOTE = "Cá nhân kinh doanh có doanh thu từ 100 triệu đồng/năm trở xuống"
NEW_QUOTE = "Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống"
PROFILE = {"loai_hinh": "ho_kinh_doanh", "nganh": "cà phê", "doanh_thu_nam": 400_000_000, "dia_ban": "TP.HCM"}


@pytest.fixture(autouse=True)
def tmp_runs(tmp_path, monkeypatch):
    monkeypatch.setattr(agent, "RUNS_DIR", tmp_path)


@pytest.fixture
def store():
    return LawStore(FIXTURES)


def submit(pid, quote):
    return call("nop_cau_tra_loi", tra_loi="Không phải nộp thuế GTGT.",
                trich_dan=[{"id": pid, "cau_trich": quote, "nhan_dinh": "ngưỡng miễn thuế"}],
                checklist=[{"viec": "Theo dõi doanh thu", "han": "", "can_cu": pid}])


def judge_ok():
    return {"ket_qua": [{"so_thu_tu": 1, "ung_ho": True, "ly_do": "khớp"}],
            "tong_the": {"ung_ho": True, "ly_do": "khớp"}}


def test_stale_citation_is_refused_then_corrected_answer_passes(store):
    client = FakeClient([call("doc_ho_so"), submit(OLD, OLD_QUOTE), call("doc_dieu_khoan", id=NEW),
                         submit(NEW, NEW_QUOTE), judge_ok()])
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE)
    assert out["trang_thai"] == "answered" and not out["can_xac_nhan"]
    assert out["trich_dan"][0]["id"] == NEW and out["trich_dan"][0]["trang"] == 1
    steps = json.loads((agent.RUNS_DIR / f"{out['run_id']}.json").read_text(encoding="utf-8"))["steps"]
    refusal = next(s for s in steps if s["tool"] == "nop_cau_tra_loi")
    assert NEW in " ".join(refusal["result"]["van_de"])


def test_three_refusals_flag_answer_for_accountant(store):
    client = FakeClient([submit(OLD, OLD_QUOTE)] * 3)
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE)
    assert out["trang_thai"] == "needs_review" and out["can_xac_nhan"]
    assert out["van_de_chua_giai_quyet"]


def test_judge_rejection_counts_as_refusal(store):
    no = {"ket_qua": [{"so_thu_tu": 1, "ung_ho": False, "ly_do": "sai đối tượng"}],
          "tong_the": {"ung_ho": True, "ly_do": ""}}
    client = FakeClient([submit(NEW, NEW_QUOTE), no, submit(NEW, NEW_QUOTE), judge_ok()])
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE)
    assert out["trang_thai"] == "answered"


def test_judge_omitting_a_citation_or_rejecting_the_answer_is_a_refusal(store):
    omitted = {"ket_qua": [], "tong_the": {"ung_ho": True, "ly_do": ""}}
    wrong_deadline = {"ket_qua": [{"so_thu_tu": 1, "ung_ho": True, "ly_do": ""}],
                      "tong_the": {"ung_ho": False, "ly_do": "hạn không có trong điều khoản"}}
    client = FakeClient([submit(NEW, NEW_QUOTE), omitted, submit(NEW, NEW_QUOTE), wrong_deadline,
                         submit(NEW, NEW_QUOTE), judge_ok()])
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE)
    assert out["trang_thai"] == "answered"
    steps = json.loads((agent.RUNS_DIR / f"{out['run_id']}.json").read_text(encoding="utf-8"))["steps"]
    problems = [" ".join(s["result"].get("van_de", [])) for s in steps]
    assert "chưa được kiểm" in problems[0] and "hạn không có" in problems[1]


def test_exhausted_refusals_never_show_failed_citations(store):
    client = FakeClient([submit(OLD, OLD_QUOTE)] * 3)
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE)
    assert out["trich_dan"] == [] and out["checklist"] == []


def test_turn_limit_returns_flagged_fallback(store):
    client = FakeClient([call("doc_ho_so")] * 3)
    out = agent.ask(client, store, "Ngưỡng miễn thuế?", "2026-03-01", PROFILE, max_turns=3)
    assert out["can_xac_nhan"] and out["trich_dan"] == []


def test_ingest_keeps_verbatim_changes_and_drops_invented_ones(store):
    text = "Điều 1. Sửa đổi khoản 1 Điều 4 như sau: Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống."
    result = {"van_ban_moi": {"so_hieu": "X", "tieu_de": "t", "hieu_luc_tu": "2026-01-01"}, "thay_doi": [
        {"trich_doan": "Hộ kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống", "loai": "sua_doi",
         "dieu_bi_tac_dong": OLD, "anh_huong_toi_ho_so": True, "giai_thich": "g", "viec_can_lam": "v",
         "han": ""},
        {"trich_doan": "câu không có trong văn bản", "loai": "sua_doi", "dieu_bi_tac_dong": OLD,
         "anh_huong_toi_ho_so": True, "giai_thich": "g", "viec_can_lam": "v", "han": ""},
        {"trich_doan": "Hộ kinh doanh có doanh thu", "loai": "bai_bo", "dieu_bi_tac_dong": "KHONG-CO",
         "anh_huong_toi_ho_so": False, "giai_thich": "g", "viec_can_lam": "", "han": ""}]}
    out = ingest.check(store, result, text)
    assert [c["dieu_bi_tac_dong"] for c in out["dieu_bi_anh_huong"]] == [OLD]
    assert len(out["bi_loai"]) == 2 and len(out["viec_can_lam"]) == 1 and out["can_xac_nhan"]


def test_ask_json_parses_structured_output():
    client = FakeClient([{"a": 1}])
    assert config.ask_json(client, "p", {"type": "object"}, "n") == {"a": 1}
    assert client.requests[0]["text"]["format"]["strict"] is True
